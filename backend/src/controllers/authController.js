import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../config/database.js';
import { generateToken, generateRefreshToken, verifyRefreshToken, decodeToken } from '../middleware/auth.js';
import { validationResult } from 'express-validator/lib/index.js';
import { sendEmail } from '../services/emailService.js';
import { renderEmailTemplate } from '../services/emailTemplateService.js';

/**
 * Controlador de autenticación
 */
class AuthController {

  constructor() {
    this.forgotPassword = this.forgotPassword.bind(this);
    this.resetPasswordWithToken = this.resetPasswordWithToken.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.me = this.me.bind(this);
    this.changePassword = this.changePassword.bind(this);
  }

  isLocalHostname(hostname) {
    const normalized = String(hostname || '').toLowerCase();
    return normalized === 'localhost'
      || normalized === '127.0.0.1'
      || /^192\.168\./.test(normalized)
      || /^10\./.test(normalized)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(normalized);
  }

  buildTenantFrontendBaseUrl(tenantSlug = '') {
    const frontendBase = String(process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '');
    if (!tenantSlug) return frontendBase;

    try {
      const parsed = new URL(frontendBase);
      if (this.isLocalHostname(parsed.hostname)) {
        return frontendBase;
      }

      const cleanSlug = String(tenantSlug).trim().toLowerCase();
      if (!cleanSlug) return frontendBase;

      const hostNoWww = parsed.hostname.replace(/^www\./i, '');
      if (hostNoWww.startsWith(`${cleanSlug}.`)) {
        return `${parsed.protocol}//${hostNoWww}${parsed.port ? `:${parsed.port}` : ''}`;
      }

      return `${parsed.protocol}//${cleanSlug}.${hostNoWww}${parsed.port ? `:${parsed.port}` : ''}`;
    } catch {
      return frontendBase;
    }
  }

  buildResetPasswordUrl(token, tenantSlug = '') {
    const frontendBase = this.buildTenantFrontendBaseUrl(tenantSlug);
    return `${frontendBase}/reset-password?token=${encodeURIComponent(token)}`;
  }

  buildTenantLoginUrl(tenantSlug = '') {
    const frontendBase = this.buildTenantFrontendBaseUrl(tenantSlug);
    return `${frontendBase}/login`;
  }

  appendTenantLoginHint(rendered, loginUrl) {
    if (!rendered || !loginUrl) return rendered;

    const hasLoginUrlInHtml = String(rendered.cuerpo_html_render || '').includes(loginUrl);
    const hasLoginUrlInText = String(rendered.cuerpo_text_render || '').includes(loginUrl);

    return {
      ...rendered,
      cuerpo_html_render: hasLoginUrlInHtml
        ? rendered.cuerpo_html_render
        : `${rendered.cuerpo_html_render}<p style="margin-top:12px; font-size:13px; color:#334155;">Al terminar, puedes ingresar desde tu clínica aquí: <a href="${loginUrl}">${loginUrl}</a></p>`,
      cuerpo_text_render: hasLoginUrlInText
        ? (rendered.cuerpo_text_render || '')
        : `${rendered.cuerpo_text_render || ''}\n\nAl terminar, puedes ingresar desde tu clínica aquí: ${loginUrl}`
    };
  }

  async forgotPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const email = String(req.body?.email || '').trim().toLowerCase();
      const documento = String(req.body?.documento || '').trim();
      const genericResponse = {
        success: true,
        message: 'Si el usuario existe, recibirá instrucciones para restablecer su contraseña'
      };

      const rawTenantSlug = req.headers['x-tenant-slug'];
      const tenantSlug = typeof rawTenantSlug === 'string' ? rawTenantSlug.trim().toLowerCase() : '';

      let tenantFilter = '';
      const params = [];
      let paramCount = 0;

      if (tenantSlug) {
        paramCount++;
        tenantFilter = ` AND u.id_tenant = (
          SELECT t.id_tenant
          FROM system.tenants t
          WHERE t.slug = $${paramCount}
            AND t.estado = 'active'
          LIMIT 1
        )`;
        params.push(tenantSlug);
      }

      paramCount++;
      const identifierClause = email
        ? `LOWER(u.email) = $${paramCount}`
        : `u.documento = $${paramCount}`;
      params.push(email || documento);

      const userResult = await query(
        `SELECT u.id_usuario, u.id_tenant, u.nombre, u.email, t.slug AS tenant_slug
         FROM vetplus_auth.usuarios u
         LEFT JOIN system.tenants t ON t.id_tenant = u.id_tenant
         WHERE ${identifierClause}
           AND u.activo = true
           ${tenantFilter}
         LIMIT 1`,
        params
      );

      if (!userResult.rows.length) {
        return res.json(genericResponse);
      }

      const user = userResult.rows[0];
      if (!user.email) {
        return res.json(genericResponse);
      }

      const plainToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
      const expirationMinutes = 30;
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

      await query(
        `DELETE FROM vetplus_auth.password_reset_tokens
         WHERE id_usuario = $1
            OR expires_at < NOW()
            OR used_at IS NOT NULL`,
        [user.id_usuario]
      );

      await query(
        `INSERT INTO vetplus_auth.password_reset_tokens (
           id_usuario, token_hash, expires_at, created_by_ip
         ) VALUES ($1, $2, $3, $4)`,
        [user.id_usuario, tokenHash, expiresAt, req.ip || null]
      );

      const effectiveTenantSlug = String(user.tenant_slug || tenantSlug || '').trim().toLowerCase();
      const resetUrl = this.buildResetPasswordUrl(plainToken, effectiveTenantSlug);
      const loginUrl = this.buildTenantLoginUrl(effectiveTenantSlug);

      const renderedRaw = await renderEmailTemplate({
        tenantId: user.id_tenant,
        key: 'auth_reset_link',
        variables: {
          usuario_nombre: user.nombre || 'usuario',
          reset_url: resetUrl,
          login_url: loginUrl,
          expiracion_minutos: String(expirationMinutes)
        }
      });

      const rendered = this.appendTenantLoginHint(renderedRaw, loginUrl);

      if (rendered) {
        try {
          await sendEmail({
            tenantId: user.id_tenant,
            to: user.email,
            subject: rendered.asunto_render,
            html: rendered.cuerpo_html_render,
            text: rendered.cuerpo_text_render || undefined,
            logContext: {
              tipo_envio: 'auth_reset_link',
              metadata: {
                id_usuario: user.id_usuario
              }
            }
          });
        } catch (mailError) {
          console.error('No se pudo enviar correo de recuperación:', mailError.message);
        }
      }

      return res.json(genericResponse);
    } catch (error) {
      console.error('Error en forgotPassword:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  async resetPasswordWithToken(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const token = String(req.body?.token || '').trim();
      const newPassword = String(req.body?.newPassword || '');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const tokenResult = await query(
        `SELECT prt.id_token, prt.id_usuario
         FROM vetplus_auth.password_reset_tokens prt
         WHERE prt.token_hash = $1
           AND prt.used_at IS NULL
           AND prt.expires_at > NOW()
         LIMIT 1`,
        [tokenHash]
      );

      if (!tokenResult.rows.length) {
        return res.status(400).json({
          success: false,
          message: 'El enlace de recuperación es inválido o ha expirado',
          error: 'INVALID_RESET_TOKEN'
        });
      }

      const tokenRow = tokenResult.rows[0];
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      await query(
        `UPDATE vetplus_auth.usuarios
         SET password_hash = $1,
             password_temporal = false,
             debe_cambiar_password = false,
             intentos_login = 0,
             bloqueado_hasta = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id_usuario = $2`,
        [newPasswordHash, tokenRow.id_usuario]
      );

      await query(
        `UPDATE vetplus_auth.password_reset_tokens
         SET used_at = NOW()
         WHERE id_token = $1`,
        [tokenRow.id_token]
      );

      await query(
        `INSERT INTO vetplus_auth.password_resets (
           id_usuario, tipo_reset, motivo, completado, completed_at
         ) VALUES ($1, 'user_change', 'Recuperación por enlace', true, NOW())`,
        [tokenRow.id_usuario]
      );

      return res.json({
        success: true,
        message: 'Contraseña restablecida exitosamente'
      });
    } catch (error) {
      console.error('Error en resetPasswordWithToken:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }
  
  /**
   * Login de usuario
   */
  async login(req, res) {
    try {
      // Verificar validaciones
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { documento, password } = req.body;
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      const rawTenantSlug = req.headers['x-tenant-slug'];
      const tenantSlug = typeof rawTenantSlug === 'string' ? rawTenantSlug.trim().toLowerCase() : '';
      const requireTenantContext = process.env.NODE_ENV === 'production' || process.env.REQUIRE_TENANT_ON_LOGIN === 'true';

      let resolvedTenant = null;

      if (tenantSlug) {
        const tenantResult = await query(
          `SELECT id_tenant, slug, nombre
           FROM system.tenants
           WHERE slug = $1 AND estado = 'active'
           LIMIT 1`,
          [tenantSlug]
        );

        if (tenantResult.rows.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Clínica inválida o inactiva',
            error: 'INVALID_TENANT_SLUG'
          });
        }

        resolvedTenant = tenantResult.rows[0];
      } else if (requireTenantContext) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere contexto de clínica para iniciar sesión',
          error: 'MISSING_TENANT_SLUG'
        });
      }

      // Buscar usuario por documento y tenant (cuando aplica por subdominio)
      const userResult = resolvedTenant
        ? await query(
          `SELECT id_usuario, id_tenant, nombre, apellido, email, documento, password_hash, rol, activo,
                  intentos_login, bloqueado_hasta, password_temporal, debe_cambiar_password, avatar_url
           FROM vetplus_auth.usuarios
           WHERE documento = $1 AND id_tenant = $2`,
          [documento, resolvedTenant.id_tenant]
        )
        : await query(
          `SELECT id_usuario, id_tenant, nombre, apellido, email, documento, password_hash, rol, activo,
                  intentos_login, bloqueado_hasta, password_temporal, debe_cambiar_password, avatar_url
           FROM vetplus_auth.usuarios
           WHERE documento = $1`,
          [documento]
        );

      if (!resolvedTenant && userResult.rows.length > 1) {
        return res.status(400).json({
          success: false,
          message: 'Documento asociado a múltiples clínicas. Inicia sesión desde el subdominio correcto.',
          error: 'AMBIGUOUS_TENANT_CONTEXT'
        });
      }

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas',
          error: 'INVALID_CREDENTIALS'
        });
      }

      const user = userResult.rows[0];

      // Verificar si el usuario está activo
      if (!user.activo) {
        return res.status(401).json({
          success: false,
          message: 'Usuario desactivado',
          error: 'USER_DISABLED'
        });
      }

      // Verificar si el usuario está bloqueado
      if (user.bloqueado_hasta && new Date() < new Date(user.bloqueado_hasta)) {
        const minutosRestantes = Math.ceil((new Date(user.bloqueado_hasta) - new Date()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Usuario bloqueado temporalmente. Intenta de nuevo en ${minutosRestantes} minuto(s).`,
          error: 'USER_LOCKED',
          bloqueado_hasta: user.bloqueado_hasta,
          minutos_restantes: minutosRestantes
        });
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        // DESARROLLO: Rate limiting más permisivo
        const nuevosIntentos = (user.intentos_login || 0) + 1;
        const bloqueadoHasta = nuevosIntentos >= 50  // Aumentado de 5 a 50 intentos
          ? new Date(Date.now() + 2 * 60 * 1000)     // Reducido de 15 a 2 minutos
          : null;

        await query(
          'UPDATE vetplus_auth.usuarios SET intentos_login = $1, bloqueado_hasta = $2 WHERE id_usuario = $3',
          [nuevosIntentos, bloqueadoHasta, user.id_usuario]
        );

        // Log de intento fallido (simplificado)
        console.log(`⚠️  Login fallido para ${documento} desde IP ${ip} (Intento ${nuevosIntentos}/50)`);

        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas',
          error: 'INVALID_CREDENTIALS',
          intentos_restantes: Math.max(0, 50 - nuevosIntentos)
        });
      }

      // Login exitoso - resetear intentos
      await query(
        'UPDATE vetplus_auth.usuarios SET intentos_login = 0, bloqueado_hasta = NULL, ultimo_login = CURRENT_TIMESTAMP WHERE id_usuario = $1',
        [user.id_usuario]
      );

      // Verificar si debe cambiar contraseña
      const needsPasswordChange = user.debe_cambiar_password || user.password_temporal;

      // Generar tokens JWT
      const token = generateToken({
        id_usuario: user.id_usuario,
        id_tenant: user.id_tenant,
        email: user.email,
        documento: user.documento,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol
      });

      const refreshToken = generateRefreshToken({
        id_usuario: user.id_usuario,
        email: user.email
      });

      // Log de login exitoso (simplificado)
      console.log(`✅ Login exitoso para ${user.documento} (${user.email}) desde IP ${ip}`);

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          refreshToken,
          user: {
            id: user.id_usuario,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            documento: user.documento,
            rol: user.rol,
            avatar_url: user.avatar_url,
            tenant_id: user.id_tenant,
            tenant_slug: resolvedTenant?.slug || null,
            tenant_nombre: resolvedTenant?.nombre || null
          },
          must_change_password: needsPasswordChange
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
    * Logout de usuario
    */
   async logout(req, res) {
     try {
       const authHeader = req.headers['authorization'];
       const token = authHeader && authHeader.split(' ')[1];

       if (token) {
         const decoded = decodeToken(token);
         const jtiMarker = decoded?.jti ? `jti:${decoded.jti}` : null;

         // Agregar token a blacklist
         await query(
           'INSERT INTO vetplus_auth.blacklisted_tokens (token, id_usuario, razon) VALUES ($1, $2, $3)',
           [token, req.user?.id_usuario, 'logout']
         );

         if (jtiMarker) {
           await query(
             'INSERT INTO vetplus_auth.blacklisted_tokens (token, id_usuario, razon) VALUES ($1, $2, $3)',
             [jtiMarker, req.user?.id_usuario, 'logout_jti']
           );
         }

         // Log de logout (simplificado)
         if (req.user) {
           console.log(`👋 Logout exitoso para usuario ${req.user.email}`);
         }
       }

       res.json({
         success: true,
         message: 'Logout exitoso'
       });

     } catch (error) {
       console.error('Error en logout:', error);
       res.status(500).json({
         success: false,
         message: 'Error interno del servidor',
         error: 'INTERNAL_ERROR'
       });
     }
   }

   /**
    * Refresh token - genera un nuevo token de acceso
    */
   async refreshToken(req, res) {
     try {
       const { refreshToken } = req.body;

       if (!refreshToken) {
         return res.status(400).json({
           success: false,
           message: 'Refresh token requerido',
           error: 'MISSING_REFRESH_TOKEN'
         });
       }

       // Verificar refresh token
       const decoded = verifyRefreshToken(refreshToken);

       // Verificar que el usuario existe y está activo
       const userResult = await query(
         'SELECT id_usuario, id_tenant, nombre, apellido, email, documento, rol, activo FROM vetplus_auth.usuarios WHERE id_usuario = $1',
         [decoded.id]
       );

       if (userResult.rows.length === 0) {
         return res.status(401).json({
           success: false,
           message: 'Usuario no encontrado',
           error: 'USER_NOT_FOUND'
         });
       }

       const user = userResult.rows[0];

       if (!user.activo) {
         return res.status(401).json({
           success: false,
           message: 'Usuario desactivado',
           error: 'USER_DISABLED'
         });
       }

       const forcedLogout = await query(
         `SELECT 1
          FROM system.session_audit
          WHERE id_usuario = $1
            AND tipo_evento = 'FORCE_LOGOUT'
            AND $2::bigint IS NOT NULL
            AND timestamp >= to_timestamp($2)
          LIMIT 1`,
         [user.id_usuario, decoded?.iat || null]
       );

       if (forcedLogout.rows.length > 0) {
         return res.status(401).json({
           success: false,
           message: 'Sesión cerrada por administrador. Debe iniciar sesión nuevamente.',
           error: 'FORCE_LOGOUT'
         });
       }

       // Generar nuevo token de acceso
       const newToken = generateToken({
         id_usuario: user.id_usuario,
         id_tenant: user.id_tenant,
         email: user.email,
         documento: user.documento,
         nombre: user.nombre,
         apellido: user.apellido,
         rol: user.rol
       });

       // Opcional: generar nuevo refresh token
       const newRefreshToken = generateRefreshToken({
         id_usuario: user.id_usuario,
         email: user.email
       });

       console.log(`🔄 Token refrescado para usuario ${user.email}`);

       res.json({
         success: true,
         message: 'Token refrescado exitosamente',
         data: {
           token: newToken,
           refreshToken: newRefreshToken
         }
       });

     } catch (error) {
       console.error('Error en refresh token:', error);

       if (error.message === 'Refresh token inválido o expirado') {
         return res.status(401).json({
           success: false,
           message: error.message,
           error: 'INVALID_REFRESH_TOKEN'
         });
       }

       res.status(500).json({
         success: false,
         message: 'Error interno del servidor',
         error: 'INTERNAL_ERROR'
       });
     }
   }

  /**
   * Obtener información del usuario actual
   */
  async me(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          error: 'NOT_AUTHENTICATED'
        });
      }

      // Obtener información actualizada del usuario
      const userResult = await query(
        `SELECT
          id_usuario,
          nombre,
          apellido,
          email,
          documento,
          rol,
          activo,
          ultimo_login,
          created_at,
          password_temporal,
          debe_cambiar_password,
          avatar_url
        FROM vetplus_auth.usuarios
        WHERE id_usuario = $1`,
        [req.user.id_usuario]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
          error: 'USER_NOT_FOUND'
        });
      }

      const user = userResult.rows[0];

      res.json({
        success: true,
        data: {
          id_usuario: user.id_usuario,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          documento: user.documento,
          rol: user.rol,
          activo: user.activo,
          primer_acceso: Boolean(user.password_temporal || user.debe_cambiar_password),
          avatar_url: user.avatar_url,
          ultimo_login: user.ultimo_login,
          created_at: user.created_at
        }
      });

    } catch (error) {
      console.error('Error en obtener usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Obtener información del usuario incluyendo flags de password temporal
      const userResult = await query(
        'SELECT password_hash, password_temporal, debe_cambiar_password FROM vetplus_auth.usuarios WHERE id_usuario = $1',
        [req.user.id_usuario]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
          error: 'USER_NOT_FOUND'
        });
      }

      const user = userResult.rows[0];

      const isTemporaryFlow = user.password_temporal || user.debe_cambiar_password;

      // Solo exigir contraseña actual cuando no es flujo de primer acceso.
      if (!isTemporaryFlow) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            message: 'Contraseña actual es requerida',
            error: 'CURRENT_PASSWORD_REQUIRED'
          });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isValidPassword) {
          return res.status(400).json({
            success: false,
            message: 'Contraseña actual incorrecta',
            error: 'INVALID_CURRENT_PASSWORD'
          });
        }
      }

      // Hashear nueva contraseña
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña y limpiar flags de password temporal
      await query(
        `UPDATE vetplus_auth.usuarios 
         SET password_hash = $1, 
             password_temporal = false, 
             debe_cambiar_password = false,
             password_reset_date = NULL,
             password_reset_by = NULL,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id_usuario = $2`,
        [newPasswordHash, req.user.id_usuario]
      );

      // Registrar el cambio en el historial si era una contraseña temporal
      if (isTemporaryFlow) {
        await query(
          `INSERT INTO vetplus_auth.password_resets 
           (id_usuario, tipo_reset, realizado_por, motivo, completado, completed_at) 
           VALUES ($1, 'user_change', $1, 'Cambio de contraseña temporal', true, CURRENT_TIMESTAMP)`,
          [req.user.id_usuario]
        );
      }

      // Log de cambio de contraseña (simplificado)
      console.log(`🔑 Cambio de contraseña exitoso para usuario ${req.user.email}`);

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      console.error('Error en cambio de contraseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}

export default new AuthController();
