/**
 * @fileoverview Servicio para generación de PDFs (facturas, fórmulas médicas, etc.)
 * @version 1.0.0
 * @author VetPlus Development Team
 */

import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Servicio para generación de PDFs
 */
class PDFGeneratorService {
    constructor() {
        this.outputDir = path.join(__dirname, '../../generated-docs');
        this.ensureOutputDir();
    }

    /**
     * Asegurar que el directorio de salida existe
     */
    async ensureOutputDir() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
        } catch (error) {
            console.error('Error creando directorio de PDFs:', error);
        }
    }

    /**
     * Obtener configuración de empresa
     */
    async getEmpresaConfig() {
        const result = await query(`
            SELECT * FROM get_empresa_config()
        `);
        
        if (result.rows.length === 0) {
            throw new Error('No hay configuración de empresa disponible');
        }
        
        return result.rows[0];
    }

    /**
     * Generar PDF de factura
     */
    async generarFacturaPDF(facturaId) {
        try {
            // Obtener datos de la factura
            const facturaResult = await query(`
                SELECT 
                    fv.*,
                    c.nombre as cliente_nombre,
                    c.email as cliente_email,
                    c.telefono as cliente_telefono,
                    c.direccion as cliente_direccion,
                    c.identificacion as cliente_identificacion,
                    u.nombre as vendedor_nombre
                FROM financial.facturas_venta fv
                JOIN clinical.clientes c ON fv.id_cliente = c.id_cliente
                LEFT JOIN auth.usuarios u ON fv.created_by = u.id_usuario
                WHERE fv.id_factura = $1
            `, [facturaId]);

            if (facturaResult.rows.length === 0) {
                throw new Error('Factura no encontrada');
            }

            const factura = facturaResult.rows[0];

            // Obtener líneas de la factura
            const lineasResult = await query(`
                SELECT 
                    lf.*,
                    p.nombre as producto_nombre,
                    p.codigo as producto_codigo,
                    p.unidad_medida
                FROM financial.lineas_factura lf
                JOIN financial.productos p ON lf.id_producto = p.id_producto
                WHERE lf.id_factura = $1
                ORDER BY lf.created_at
            `, [facturaId]);

            // Obtener configuración de empresa
            const empresaConfig = await this.getEmpresaConfig();

            // Generar PDF
            const filename = `factura-${factura.numero_factura}.pdf`;
            const filepath = path.join(this.outputDir, filename);

            const doc = new PDFDocument({ margin: 50 });
            const stream = fs.createWriteStream(filepath);
            doc.pipe(stream);

            // Header con logo e información de empresa
            await this.addHeader(doc, empresaConfig, 'FACTURA DE VENTA');

            // Información de la factura
            doc.fontSize(12);
            const startY = 150;
            
            // Columna izquierda - Datos del cliente
            doc.text('DATOS DEL CLIENTE:', 50, startY, { underline: true });
            doc.text(`Nombre: ${factura.cliente_nombre}`, 50, startY + 20);
            doc.text(`Identificación: ${factura.cliente_identificacion || 'N/A'}`, 50, startY + 35);
            doc.text(`Teléfono: ${factura.cliente_telefono || 'N/A'}`, 50, startY + 50);
            doc.text(`Email: ${factura.cliente_email || 'N/A'}`, 50, startY + 65);
            doc.text(`Dirección: ${factura.cliente_direccion || 'N/A'}`, 50, startY + 80);

            // Columna derecha - Datos de la factura
            doc.text('DATOS DE LA FACTURA:', 350, startY, { underline: true });
            doc.text(`Número: ${factura.numero_factura}`, 350, startY + 20);
            doc.text(`Fecha: ${new Date(factura.fecha).toLocaleDateString('es-CO')}`, 350, startY + 35);
            doc.text(`Vendedor: ${factura.vendedor_nombre || 'N/A'}`, 350, startY + 50);
            doc.text(`Estado: ${factura.estado.toUpperCase()}`, 350, startY + 65);

            // Tabla de productos
            const tableStartY = startY + 120;
            await this.addFacturaTable(doc, lineasResult.rows, tableStartY);

            // Totales
            const totalsY = tableStartY + (lineasResult.rows.length * 20) + 80;
            this.addFacturaTotals(doc, factura, totalsY);

            // Footer
            this.addFooter(doc, empresaConfig);

            doc.end();

            // Esperar a que termine de escribir
            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            return filepath;

        } catch (error) {
            console.error('Error generando PDF de factura:', error);
            throw error;
        }
    }

    /**
     * Generar PDF de fórmula médica
     */
    async generarFormulaPDF(consultaId) {
        try {
            // Obtener datos de la consulta
            const consultaResult = await query(`
                SELECT 
                    cc.*,
                    c.nombre as cliente_nombre,
                    c.telefono as cliente_telefono,
                    c.email as cliente_email,
                    c.identificacion as cliente_identificacion,
                    m.nombre as mascota_nombre,
                    m.especie,
                    m.raza,
                    m.edad,
                    m.peso,
                    u.nombre as veterinario_nombre,
                    u.numero_licencia as veterinario_licencia
                FROM clinical.consultas_clinicas cc
                JOIN clinical.mascotas m ON cc.id_mascota = m.id_mascota
                JOIN clinical.clientes c ON m.id_cliente = c.id_cliente
                JOIN auth.usuarios u ON cc.id_veterinario = u.id_usuario
                WHERE cc.id_consulta = $1
            `, [consultaId]);

            if (consultaResult.rows.length === 0) {
                throw new Error('Consulta no encontrada');
            }

            const consulta = consultaResult.rows[0];

            // Obtener configuración de empresa
            const empresaConfig = await this.getEmpresaConfig();

            // Generar PDF
            const filename = `formula-${consulta.id_consulta.slice(-8)}.pdf`;
            const filepath = path.join(this.outputDir, filename);

            const doc = new PDFDocument({ margin: 50 });
            const stream = fs.createWriteStream(filepath);
            doc.pipe(stream);

            // Header
            await this.addHeader(doc, empresaConfig, 'FÓRMULA MÉDICA VETERINARIA');

            // Información del propietario y mascota
            doc.fontSize(12);
            const startY = 150;

            // Datos del propietario
            doc.text('DATOS DEL PROPIETARIO:', 50, startY, { underline: true });
            doc.text(`Nombre: ${consulta.cliente_nombre}`, 50, startY + 20);
            doc.text(`Identificación: ${consulta.cliente_identificacion || 'N/A'}`, 50, startY + 35);
            doc.text(`Teléfono: ${consulta.cliente_telefono || 'N/A'}`, 50, startY + 50);

            // Datos de la mascota
            doc.text('DATOS DEL PACIENTE:', 350, startY, { underline: true });
            doc.text(`Nombre: ${consulta.mascota_nombre}`, 350, startY + 20);
            doc.text(`Especie: ${consulta.especie}`, 350, startY + 35);
            doc.text(`Raza: ${consulta.raza || 'N/A'}`, 350, startY + 50);
            doc.text(`Edad: ${consulta.edad || 'N/A'}`, 350, startY + 65);
            doc.text(`Peso: ${consulta.peso || 'N/A'} kg`, 350, startY + 80);

            // Datos de consulta
            const consultaY = startY + 120;
            doc.text('DATOS DE LA CONSULTA:', 50, consultaY, { underline: true });
            doc.text(`Fecha: ${new Date(consulta.fecha).toLocaleDateString('es-CO')}`, 50, consultaY + 20);
            doc.text(`Veterinario: ${consulta.veterinario_nombre}`, 50, consultaY + 35);
            doc.text(`Licencia: ${consulta.veterinario_licencia || 'N/A'}`, 50, consultaY + 50);

            // Diagnóstico
            const diagnosticoY = consultaY + 80;
            doc.text('DIAGNÓSTICO:', 50, diagnosticoY, { underline: true });
            const diagnosticoText = consulta.diagnostico || 'No especificado';
            doc.text(diagnosticoText, 50, diagnosticoY + 20, { width: 500, align: 'justify' });

            // Tratamiento
            const tratamientoY = diagnosticoY + 80;
            doc.text('TRATAMIENTO PRESCRITO:', 50, tratamientoY, { underline: true });
            const tratamientoText = consulta.tratamiento || 'No especificado';
            doc.text(tratamientoText, 50, tratamientoY + 20, { width: 500, align: 'justify' });

            // Observaciones
            if (consulta.observaciones) {
                const observacionesY = tratamientoY + 120;
                doc.text('OBSERVACIONES:', 50, observacionesY, { underline: true });
                doc.text(consulta.observaciones, 50, observacionesY + 20, { width: 500, align: 'justify' });
            }

            // Firma del veterinario
            const firmaY = doc.y + 60;
            doc.text('____________________________', 350, firmaY);
            doc.text(`${consulta.veterinario_nombre}`, 350, firmaY + 20);
            doc.text(`Médico Veterinario`, 350, firmaY + 35);
            doc.text(`Lic. ${consulta.veterinario_licencia || 'N/A'}`, 350, firmaY + 50);

            // Footer
            this.addFooter(doc, empresaConfig);

            doc.end();

            // Esperar a que termine de escribir
            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            return filepath;

        } catch (error) {
            console.error('Error generando PDF de fórmula:', error);
            throw error;
        }
    }

    /**
     * Agregar header con logo e información de empresa
     */
    async addHeader(doc, empresaConfig, titulo) {
        // Logo (si existe)
        if (empresaConfig.logo_url) {
            try {
                const logoPath = path.join(__dirname, '../../public', empresaConfig.logo_url);
                await fs.access(logoPath);
                doc.image(logoPath, 50, 50, { width: 80 });
            } catch (error) {
                // Si no hay logo, continuar sin él
            }
        }

        // Información de empresa
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text(empresaConfig.nombre_empresa, 150, 50);
        
        doc.fontSize(10).font('Helvetica');
        doc.text(`NIT: ${empresaConfig.nit}`, 150, 70);
        doc.text(`${empresaConfig.direccion}`, 150, 82);
        if (empresaConfig.telefono) {
            doc.text(`Tel: ${empresaConfig.telefono}`, 150, 94);
        }
        if (empresaConfig.email) {
            doc.text(`Email: ${empresaConfig.email}`, 150, 106);
        }

        // Título del documento
        doc.fontSize(18).font('Helvetica-Bold');
        doc.text(titulo, 350, 60, { align: 'right' });

        // Línea separadora
        doc.strokeColor('#ccc')
           .lineWidth(1)
           .moveTo(50, 130)
           .lineTo(550, 130)
           .stroke();
    }

    /**
     * Agregar tabla de productos en factura
     */
    async addFacturaTable(doc, lineas, startY) {
        // Headers
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('CÓDIGO', 50, startY);
        doc.text('DESCRIPCIÓN', 120, startY);
        doc.text('CANT', 350, startY);
        doc.text('PRECIO', 400, startY);
        doc.text('TOTAL', 480, startY);

        // Línea debajo del header
        doc.strokeColor('#ccc')
           .lineWidth(0.5)
           .moveTo(50, startY + 15)
           .lineTo(550, startY + 15)
           .stroke();

        // Datos
        doc.font('Helvetica');
        let currentY = startY + 25;

        for (const linea of lineas) {
            doc.text(linea.producto_codigo || 'N/A', 50, currentY);
            doc.text(linea.producto_nombre, 120, currentY, { width: 200 });
            doc.text(linea.cantidad.toString(), 350, currentY);
            doc.text(`$${Number(linea.precio_unitario).toLocaleString('es-CO')}`, 400, currentY);
            doc.text(`$${Number(linea.subtotal).toLocaleString('es-CO')}`, 480, currentY);
            currentY += 20;
        }

        // Línea final
        doc.strokeColor('#ccc')
           .lineWidth(0.5)
           .moveTo(50, currentY)
           .lineTo(550, currentY)
           .stroke();
    }

    /**
     * Agregar totales de factura
     */
    addFacturaTotals(doc, factura, startY) {
        doc.fontSize(12).font('Helvetica-Bold');
        
        const subtotal = Number(factura.subtotal || 0);
        const impuestos = Number(factura.impuestos || 0);
        const descuentos = Number(factura.descuentos || 0);
        const total = Number(factura.total || 0);

        doc.text('SUBTOTAL:', 400, startY);
        doc.text(`$${subtotal.toLocaleString('es-CO')}`, 480, startY);

        if (descuentos > 0) {
            doc.text('DESCUENTOS:', 400, startY + 20);
            doc.text(`-$${descuentos.toLocaleString('es-CO')}`, 480, startY + 20);
        }

        if (impuestos > 0) {
            doc.text('IMPUESTOS:', 400, startY + 40);
            doc.text(`$${impuestos.toLocaleString('es-CO')}`, 480, startY + 40);
        }

        // Línea antes del total
        doc.strokeColor('#000')
           .lineWidth(1)
           .moveTo(400, startY + 60)
           .lineTo(550, startY + 60)
           .stroke();

        doc.fontSize(14);
        doc.text('TOTAL:', 400, startY + 70);
        doc.text(`$${total.toLocaleString('es-CO')}`, 480, startY + 70);
    }

    /**
     * Agregar footer
     */
    addFooter(doc, empresaConfig) {
        const pageHeight = doc.page.height;
        const footerY = pageHeight - 100;

        // Línea separadora
        doc.strokeColor('#ccc')
           .lineWidth(0.5)
           .moveTo(50, footerY)
           .lineTo(550, footerY)
           .stroke();

        doc.fontSize(8).font('Helvetica');
        
        if (empresaConfig.pie_factura) {
            doc.text(empresaConfig.pie_factura, 50, footerY + 10, { 
                width: 500, 
                align: 'center' 
            });
        }

        // Información adicional
        doc.text(`Documento generado el ${new Date().toLocaleString('es-CO')}`, 50, footerY + 40, {
            width: 500,
            align: 'center'
        });
    }

    /**
     * Limpiar archivos PDF antiguos
     */
    async cleanupOldPDFs(daysOld = 30) {
        try {
            const files = await fs.readdir(this.outputDir);
            const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
            
            let deletedCount = 0;
            
            for (const file of files) {
                if (file.endsWith('.pdf')) {
                    const filepath = path.join(this.outputDir, file);
                    const stats = await fs.stat(filepath);
                    
                    if (stats.mtime.getTime() < cutoffDate) {
                        await fs.unlink(filepath);
                        deletedCount++;
                    }
                }
            }
            
            return deletedCount;
        } catch (error) {
            console.error('Error limpiando PDFs antiguos:', error);
            throw error;
        }
    }
}

// Exportar instancia singleton
const pdfGeneratorService = new PDFGeneratorService();
export default pdfGeneratorService;