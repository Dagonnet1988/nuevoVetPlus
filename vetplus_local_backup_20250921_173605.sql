--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY vetplus_auth.sesiones DROP CONSTRAINT IF EXISTS sesiones_id_usuario_fkey;
ALTER TABLE IF EXISTS ONLY vetplus_auth.password_resets DROP CONSTRAINT IF EXISTS password_resets_realizado_por_fkey;
ALTER TABLE IF EXISTS ONLY vetplus_auth.password_resets DROP CONSTRAINT IF EXISTS password_resets_id_usuario_fkey;
ALTER TABLE IF EXISTS ONLY vetplus_auth.google_calendar_config DROP CONSTRAINT IF EXISTS google_calendar_config_configured_by_fkey;
ALTER TABLE IF EXISTS ONLY vetplus_auth.usuarios DROP CONSTRAINT IF EXISTS fk_password_reset_by;
ALTER TABLE IF EXISTS ONLY vetplus_auth.blacklisted_tokens DROP CONSTRAINT IF EXISTS blacklisted_tokens_id_usuario_fkey;
ALTER TABLE IF EXISTS ONLY financial.transferencias_cajas DROP CONSTRAINT IF EXISTS transferencias_cajas_id_caja_origen_fkey;
ALTER TABLE IF EXISTS ONLY financial.transferencias_cajas DROP CONSTRAINT IF EXISTS transferencias_cajas_id_caja_destino_fkey;
ALTER TABLE IF EXISTS ONLY financial.transferencias_cajas DROP CONSTRAINT IF EXISTS transferencias_cajas_created_by_fkey;
ALTER TABLE IF EXISTS ONLY financial.sesiones_terapia DROP CONSTRAINT IF EXISTS sesiones_terapia_id_control_fkey;
ALTER TABLE IF EXISTS ONLY financial.ordenes_compra DROP CONSTRAINT IF EXISTS ordenes_compra_id_proveedor_fkey;
ALTER TABLE IF EXISTS ONLY financial.lineas_orden_compra DROP CONSTRAINT IF EXISTS lineas_orden_compra_id_producto_fkey;
ALTER TABLE IF EXISTS ONLY financial.lineas_orden_compra DROP CONSTRAINT IF EXISTS lineas_orden_compra_id_orden_fkey;
ALTER TABLE IF EXISTS ONLY financial.lineas_factura DROP CONSTRAINT IF EXISTS lineas_factura_id_producto_fkey;
ALTER TABLE IF EXISTS ONLY financial.lineas_factura DROP CONSTRAINT IF EXISTS lineas_factura_id_factura_fkey;
ALTER TABLE IF EXISTS ONLY financial.ingresos DROP CONSTRAINT IF EXISTS ingresos_id_concepto_ingreso_fkey;
ALTER TABLE IF EXISTS ONLY financial.ingresos DROP CONSTRAINT IF EXISTS ingresos_id_caja_fkey;
ALTER TABLE IF EXISTS ONLY financial.egresos DROP CONSTRAINT IF EXISTS fk_egresos_orden_compra;
ALTER TABLE IF EXISTS ONLY financial.facturas_venta DROP CONSTRAINT IF EXISTS facturas_venta_id_consulta_fkey;
ALTER TABLE IF EXISTS ONLY financial.facturas_venta DROP CONSTRAINT IF EXISTS facturas_venta_id_cliente_fkey;
ALTER TABLE IF EXISTS ONLY financial.facturas_venta DROP CONSTRAINT IF EXISTS facturas_venta_id_caja_fkey;
ALTER TABLE IF EXISTS ONLY financial.egresos DROP CONSTRAINT IF EXISTS egresos_id_concepto_egreso_fkey;
ALTER TABLE IF EXISTS ONLY financial.egresos DROP CONSTRAINT IF EXISTS egresos_id_caja_fkey;
ALTER TABLE IF EXISTS ONLY financial.control_terapias DROP CONSTRAINT IF EXISTS control_terapias_id_producto_fkey;
ALTER TABLE IF EXISTS ONLY financial.control_terapias DROP CONSTRAINT IF EXISTS control_terapias_id_mascota_fkey;
ALTER TABLE IF EXISTS ONLY financial.control_terapias DROP CONSTRAINT IF EXISTS control_terapias_id_factura_fkey;
ALTER TABLE IF EXISTS ONLY financial.conceptos_ingresos DROP CONSTRAINT IF EXISTS conceptos_ingresos_id_categoria_fkey;
ALTER TABLE IF EXISTS ONLY financial.conceptos_egresos DROP CONSTRAINT IF EXISTS conceptos_egresos_id_categoria_fkey;
ALTER TABLE IF EXISTS ONLY clinical.vacunas_tratamientos DROP CONSTRAINT IF EXISTS vacunas_tratamientos_id_mascota_fkey;
ALTER TABLE IF EXISTS ONLY clinical.mascotas DROP CONSTRAINT IF EXISTS mascotas_id_cliente_fkey;
ALTER TABLE IF EXISTS ONLY clinical.google_calendar_audit_log DROP CONSTRAINT IF EXISTS google_calendar_audit_log_appointment_id_fkey;
ALTER TABLE IF EXISTS ONLY clinical.consultas_clinicas DROP CONSTRAINT IF EXISTS consultas_clinicas_id_mascota_fkey;
ALTER TABLE IF EXISTS ONLY clinical.consultas_clinicas DROP CONSTRAINT IF EXISTS consultas_clinicas_id_cita_fkey;
ALTER TABLE IF EXISTS ONLY clinical.calendario_citas DROP CONSTRAINT IF EXISTS calendario_citas_id_mascota_fkey;
ALTER TABLE IF EXISTS ONLY clinical.calendario_citas DROP CONSTRAINT IF EXISTS calendario_citas_id_consulta_fkey;
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON vetplus_auth.usuarios;
DROP TRIGGER IF EXISTS tr_google_calendar_config_updated_at ON vetplus_auth.google_calendar_config;
DROP TRIGGER IF EXISTS tr_audit_google_calendar_config ON vetplus_auth.google_calendar_config;
DROP TRIGGER IF EXISTS audit_usuarios ON vetplus_auth.usuarios;
DROP TRIGGER IF EXISTS update_proveedores_updated_at ON financial.proveedores;
DROP TRIGGER IF EXISTS update_productos_updated_at ON financial.productos;
DROP TRIGGER IF EXISTS update_ordenes_updated_at ON financial.ordenes_compra;
DROP TRIGGER IF EXISTS update_control_terapias_updated_at ON financial.control_terapias;
DROP TRIGGER IF EXISTS update_cajas_updated_at ON financial.cajas;
DROP TRIGGER IF EXISTS trigger_update_saldo_ingreso ON financial.ingresos;
DROP TRIGGER IF EXISTS trigger_update_saldo_egreso ON financial.egresos;
DROP TRIGGER IF EXISTS trigger_stock_orden_compra ON financial.lineas_orden_compra;
DROP TRIGGER IF EXISTS trigger_stock_factura_venta ON financial.lineas_factura;
DROP TRIGGER IF EXISTS trigger_ingreso_factura ON financial.facturas_venta;
DROP TRIGGER IF EXISTS audit_proveedores ON financial.proveedores;
DROP TRIGGER IF EXISTS audit_productos ON financial.productos;
DROP TRIGGER IF EXISTS audit_ordenes ON financial.ordenes_compra;
DROP TRIGGER IF EXISTS audit_lineas_orden ON financial.lineas_orden_compra;
DROP TRIGGER IF EXISTS audit_lineas_factura ON financial.lineas_factura;
DROP TRIGGER IF EXISTS audit_ingresos ON financial.ingresos;
DROP TRIGGER IF EXISTS audit_facturas ON financial.facturas_venta;
DROP TRIGGER IF EXISTS audit_egresos ON financial.egresos;
DROP TRIGGER IF EXISTS audit_control_terapias ON financial.control_terapias;
DROP TRIGGER IF EXISTS audit_cajas ON financial.cajas;
DROP TRIGGER IF EXISTS update_mascotas_updated_at ON clinical.mascotas;
DROP TRIGGER IF EXISTS update_consultas_updated_at ON clinical.consultas_clinicas;
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clinical.clientes;
DROP TRIGGER IF EXISTS update_calendario_updated_at ON clinical.calendario_citas;
DROP TRIGGER IF EXISTS tr_audit_google_calendar_sync ON clinical.calendario_citas;
DROP TRIGGER IF EXISTS audit_mascotas ON clinical.mascotas;
DROP TRIGGER IF EXISTS audit_consultas ON clinical.consultas_clinicas;
DROP TRIGGER IF EXISTS audit_clientes ON clinical.clientes;
DROP TRIGGER IF EXISTS audit_citas ON clinical.calendario_citas;
DROP INDEX IF EXISTS vetplus_auth.idx_usuarios_rol;
DROP INDEX IF EXISTS vetplus_auth.idx_usuarios_password_temporal;
DROP INDEX IF EXISTS vetplus_auth.idx_usuarios_email;
DROP INDEX IF EXISTS vetplus_auth.idx_usuarios_activo;
DROP INDEX IF EXISTS vetplus_auth.idx_sesiones_usuario;
DROP INDEX IF EXISTS vetplus_auth.idx_sesiones_token;
DROP INDEX IF EXISTS vetplus_auth.idx_password_resets_usuario;
DROP INDEX IF EXISTS vetplus_auth.idx_password_resets_date;
DROP INDEX IF EXISTS vetplus_auth.idx_password_resets_admin;
DROP INDEX IF EXISTS vetplus_auth.idx_google_calendar_webhook_channel;
DROP INDEX IF EXISTS vetplus_auth.idx_google_calendar_config_single_active;
DROP INDEX IF EXISTS vetplus_auth.idx_google_calendar_config_configured_by;
DROP INDEX IF EXISTS vetplus_auth.idx_google_calendar_config_active;
DROP INDEX IF EXISTS vetplus_auth.idx_blacklisted_tokens_token;
DROP INDEX IF EXISTS vetplus_auth.idx_blacklisted_tokens_created;
DROP INDEX IF EXISTS financial.idx_transferencias_origen;
DROP INDEX IF EXISTS financial.idx_transferencias_fecha;
DROP INDEX IF EXISTS financial.idx_transferencias_destino;
DROP INDEX IF EXISTS financial.idx_sesiones_realizador;
DROP INDEX IF EXISTS financial.idx_sesiones_fecha;
DROP INDEX IF EXISTS financial.idx_sesiones_control;
DROP INDEX IF EXISTS financial.idx_proveedores_activo;
DROP INDEX IF EXISTS financial.idx_productos_tipo;
DROP INDEX IF EXISTS financial.idx_productos_inventariable;
DROP INDEX IF EXISTS financial.idx_productos_codigo_barras;
DROP INDEX IF EXISTS financial.idx_productos_codigo;
DROP INDEX IF EXISTS financial.idx_ordenes_vencimiento;
DROP INDEX IF EXISTS financial.idx_ordenes_proveedor;
DROP INDEX IF EXISTS financial.idx_ordenes_estado;
DROP INDEX IF EXISTS financial.idx_ingresos_fecha;
DROP INDEX IF EXISTS financial.idx_ingresos_concepto;
DROP INDEX IF EXISTS financial.idx_ingresos_caja;
DROP INDEX IF EXISTS financial.idx_facturas_fecha;
DROP INDEX IF EXISTS financial.idx_facturas_estado;
DROP INDEX IF EXISTS financial.idx_facturas_consulta;
DROP INDEX IF EXISTS financial.idx_facturas_cliente;
DROP INDEX IF EXISTS financial.idx_egresos_fecha;
DROP INDEX IF EXISTS financial.idx_egresos_concepto;
DROP INDEX IF EXISTS financial.idx_egresos_categoria;
DROP INDEX IF EXISTS financial.idx_egresos_caja;
DROP INDEX IF EXISTS financial.idx_control_mascota;
DROP INDEX IF EXISTS financial.idx_control_activo;
DROP INDEX IF EXISTS financial.idx_conceptos_ingresos_categoria;
DROP INDEX IF EXISTS financial.idx_conceptos_egresos_categoria;
DROP INDEX IF EXISTS financial.idx_categorias_ingresos_codigo;
DROP INDEX IF EXISTS financial.idx_categorias_egresos_codigo;
DROP INDEX IF EXISTS financial.idx_cajas_activa;
DROP INDEX IF EXISTS clinical.idx_vacunas_mascota;
DROP INDEX IF EXISTS clinical.idx_mascotas_nombre;
DROP INDEX IF EXISTS clinical.idx_mascotas_especie;
DROP INDEX IF EXISTS clinical.idx_mascotas_cliente;
DROP INDEX IF EXISTS clinical.idx_google_audit_date;
DROP INDEX IF EXISTS clinical.idx_google_audit_appointment;
DROP INDEX IF EXISTS clinical.idx_google_audit_action;
DROP INDEX IF EXISTS clinical.idx_consultas_veterinario;
DROP INDEX IF EXISTS clinical.idx_consultas_mascota;
DROP INDEX IF EXISTS clinical.idx_consultas_fecha;
DROP INDEX IF EXISTS clinical.idx_consultas_cita;
DROP INDEX IF EXISTS clinical.idx_clientes_nombre;
DROP INDEX IF EXISTS clinical.idx_clientes_cedula;
DROP INDEX IF EXISTS clinical.idx_citas_veterinario;
DROP INDEX IF EXISTS clinical.idx_citas_mascota;
DROP INDEX IF EXISTS clinical.idx_citas_google_sync_status;
DROP INDEX IF EXISTS clinical.idx_citas_google_event_id;
DROP INDEX IF EXISTS clinical.idx_citas_fecha;
DROP INDEX IF EXISTS clinical.idx_citas_estado;
DROP INDEX IF EXISTS clinical.idx_citas_consulta;
ALTER TABLE IF EXISTS ONLY vetplus_auth.usuarios DROP CONSTRAINT IF EXISTS usuarios_pkey;
ALTER TABLE IF EXISTS ONLY vetplus_auth.usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;
ALTER TABLE IF EXISTS ONLY vetplus_auth.usuarios DROP CONSTRAINT IF EXISTS usuarios_documento_key;
ALTER TABLE IF EXISTS ONLY vetplus_auth.sesiones DROP CONSTRAINT IF EXISTS sesiones_token_jti_key;
ALTER TABLE IF EXISTS ONLY vetplus_auth.sesiones DROP CONSTRAINT IF EXISTS sesiones_pkey;
ALTER TABLE IF EXISTS ONLY vetplus_auth.password_resets DROP CONSTRAINT IF EXISTS password_resets_pkey;
ALTER TABLE IF EXISTS ONLY vetplus_auth.google_calendar_config DROP CONSTRAINT IF EXISTS google_calendar_config_pkey;
ALTER TABLE IF EXISTS ONLY vetplus_auth.blacklisted_tokens DROP CONSTRAINT IF EXISTS blacklisted_tokens_pkey;
ALTER TABLE IF EXISTS ONLY financial.transferencias_cajas DROP CONSTRAINT IF EXISTS transferencias_cajas_pkey;
ALTER TABLE IF EXISTS ONLY financial.transferencias_cajas DROP CONSTRAINT IF EXISTS transferencias_cajas_codigo_transferencia_key;
ALTER TABLE IF EXISTS ONLY financial.sesiones_terapia DROP CONSTRAINT IF EXISTS sesiones_terapia_pkey;
ALTER TABLE IF EXISTS ONLY financial.proveedores DROP CONSTRAINT IF EXISTS proveedores_pkey;
ALTER TABLE IF EXISTS ONLY financial.proveedores DROP CONSTRAINT IF EXISTS proveedores_nit_key;
ALTER TABLE IF EXISTS ONLY financial.productos DROP CONSTRAINT IF EXISTS productos_pkey;
ALTER TABLE IF EXISTS ONLY financial.productos DROP CONSTRAINT IF EXISTS productos_codigo_key;
ALTER TABLE IF EXISTS ONLY financial.productos DROP CONSTRAINT IF EXISTS productos_codigo_barras_key;
ALTER TABLE IF EXISTS ONLY financial.ordenes_compra DROP CONSTRAINT IF EXISTS ordenes_compra_pkey;
ALTER TABLE IF EXISTS ONLY financial.ordenes_compra DROP CONSTRAINT IF EXISTS ordenes_compra_codigo_orden_key;
ALTER TABLE IF EXISTS ONLY financial.lineas_orden_compra DROP CONSTRAINT IF EXISTS lineas_orden_compra_pkey;
ALTER TABLE IF EXISTS ONLY financial.lineas_factura DROP CONSTRAINT IF EXISTS lineas_factura_pkey;
ALTER TABLE IF EXISTS ONLY financial.ingresos DROP CONSTRAINT IF EXISTS ingresos_pkey;
ALTER TABLE IF EXISTS ONLY financial.ingresos DROP CONSTRAINT IF EXISTS ingresos_codigo_ingreso_key;
ALTER TABLE IF EXISTS ONLY financial.facturas_venta DROP CONSTRAINT IF EXISTS facturas_venta_pkey;
ALTER TABLE IF EXISTS ONLY financial.facturas_venta DROP CONSTRAINT IF EXISTS facturas_venta_codigo_factura_key;
ALTER TABLE IF EXISTS ONLY financial.egresos DROP CONSTRAINT IF EXISTS egresos_pkey;
ALTER TABLE IF EXISTS ONLY financial.egresos DROP CONSTRAINT IF EXISTS egresos_codigo_egreso_key;
ALTER TABLE IF EXISTS ONLY financial.control_terapias DROP CONSTRAINT IF EXISTS control_terapias_pkey;
ALTER TABLE IF EXISTS ONLY financial.conceptos_ingresos DROP CONSTRAINT IF EXISTS conceptos_ingresos_pkey;
ALTER TABLE IF EXISTS ONLY financial.conceptos_ingresos DROP CONSTRAINT IF EXISTS conceptos_ingresos_codigo_key;
ALTER TABLE IF EXISTS ONLY financial.conceptos_egresos DROP CONSTRAINT IF EXISTS conceptos_egresos_pkey;
ALTER TABLE IF EXISTS ONLY financial.conceptos_egresos DROP CONSTRAINT IF EXISTS conceptos_egresos_codigo_key;
ALTER TABLE IF EXISTS ONLY financial.categorias_ingresos DROP CONSTRAINT IF EXISTS categorias_ingresos_pkey;
ALTER TABLE IF EXISTS ONLY financial.categorias_ingresos DROP CONSTRAINT IF EXISTS categorias_ingresos_codigo_key;
ALTER TABLE IF EXISTS ONLY financial.categorias_egresos DROP CONSTRAINT IF EXISTS categorias_egresos_pkey;
ALTER TABLE IF EXISTS ONLY financial.categorias_egresos DROP CONSTRAINT IF EXISTS categorias_egresos_codigo_key;
ALTER TABLE IF EXISTS ONLY financial.cajas DROP CONSTRAINT IF EXISTS cajas_pkey;
ALTER TABLE IF EXISTS ONLY financial.cajas DROP CONSTRAINT IF EXISTS cajas_nombre_key;
ALTER TABLE IF EXISTS ONLY clinical.vacunas_tratamientos DROP CONSTRAINT IF EXISTS vacunas_tratamientos_pkey;
ALTER TABLE IF EXISTS ONLY clinical.mascotas DROP CONSTRAINT IF EXISTS mascotas_pkey;
ALTER TABLE IF EXISTS ONLY clinical.google_calendar_audit_log DROP CONSTRAINT IF EXISTS google_calendar_audit_log_pkey;
ALTER TABLE IF EXISTS ONLY clinical.consultas_clinicas DROP CONSTRAINT IF EXISTS consultas_clinicas_pkey;
ALTER TABLE IF EXISTS ONLY clinical.consultas_clinicas DROP CONSTRAINT IF EXISTS consultas_clinicas_codigo_consulta_key;
ALTER TABLE IF EXISTS ONLY clinical.clientes DROP CONSTRAINT IF EXISTS clientes_pkey;
ALTER TABLE IF EXISTS ONLY clinical.clientes DROP CONSTRAINT IF EXISTS clientes_cedula_key;
ALTER TABLE IF EXISTS ONLY clinical.calendario_citas DROP CONSTRAINT IF EXISTS calendario_citas_pkey;
ALTER TABLE IF EXISTS ONLY clinical.calendario_citas DROP CONSTRAINT IF EXISTS calendario_citas_codigo_cita_key;
ALTER TABLE IF EXISTS clinical.google_calendar_audit_log ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS vetplus_auth.sesiones;
DROP TABLE IF EXISTS vetplus_auth.password_resets;
DROP TABLE IF EXISTS vetplus_auth.google_calendar_config;
DROP TABLE IF EXISTS vetplus_auth.blacklisted_tokens;
DROP TABLE IF EXISTS vetplus_auth.usuarios;
DROP VIEW IF EXISTS financial.v_saldos_cajas;
DROP VIEW IF EXISTS financial.v_productos_stock_bajo;
DROP TABLE IF EXISTS financial.transferencias_cajas;
DROP TABLE IF EXISTS financial.sesiones_terapia;
DROP VIEW IF EXISTS financial.reporte_pnl;
DROP TABLE IF EXISTS financial.proveedores;
DROP TABLE IF EXISTS financial.productos;
DROP TABLE IF EXISTS financial.ordenes_compra;
DROP TABLE IF EXISTS financial.lineas_orden_compra;
DROP TABLE IF EXISTS financial.lineas_factura;
DROP TABLE IF EXISTS financial.ingresos;
DROP TABLE IF EXISTS financial.facturas_venta;
DROP TABLE IF EXISTS financial.egresos;
DROP TABLE IF EXISTS financial.control_terapias;
DROP TABLE IF EXISTS financial.conceptos_ingresos;
DROP TABLE IF EXISTS financial.conceptos_egresos;
DROP TABLE IF EXISTS financial.categorias_ingresos;
DROP TABLE IF EXISTS financial.categorias_egresos;
DROP TABLE IF EXISTS financial.cajas;
DROP TABLE IF EXISTS clinical.vacunas_tratamientos;
DROP TABLE IF EXISTS clinical.mascotas;
DROP SEQUENCE IF EXISTS clinical.google_calendar_audit_log_id_seq;
DROP TABLE IF EXISTS clinical.google_calendar_audit_log;
DROP TABLE IF EXISTS clinical.consultas_clinicas;
DROP TABLE IF EXISTS clinical.clientes;
DROP TABLE IF EXISTS clinical.calendario_citas;
DROP SCHEMA IF EXISTS vetplus_auth;
DROP SCHEMA IF EXISTS financial;
DROP SCHEMA IF EXISTS clinical;
--
-- Name: clinical; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA clinical;


--
-- Name: SCHEMA clinical; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA clinical IS 'Módulo clínico: clientes, mascotas, consultas';


--
-- Name: financial; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA financial;


--
-- Name: SCHEMA financial; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA financial IS 'Módulo financiero: cajas, productos, facturación';


--
-- Name: vetplus_auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vetplus_auth;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: calendario_citas; Type: TABLE; Schema: clinical; Owner: -
--

CREATE TABLE clinical.calendario_citas (
    id_cita uuid NOT NULL,
    codigo_cita character varying(20) NOT NULL,
    id_mascota uuid NOT NULL,
    id_veterinario uuid NOT NULL,
    tipo character varying(30) NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    motivo text,
    notas text,
    recordatorio_enviado boolean DEFAULT false,
    id_consulta uuid,
    google_event_id character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    google_sync_status character varying(20) DEFAULT 'pending'::character varying,
    google_sync_error text,
    last_google_sync timestamp with time zone,
    fecha_inicio timestamp without time zone NOT NULL,
    fecha_fin timestamp without time zone NOT NULL,
    CONSTRAINT calendario_citas_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'confirmada'::character varying, 'en_curso'::character varying, 'completada'::character varying, 'cancelada'::character varying, 'no_asistio'::character varying])::text[]))),
    CONSTRAINT calendario_citas_google_sync_status_check CHECK (((google_sync_status)::text = ANY ((ARRAY['pending'::character varying, 'synced'::character varying, 'failed'::character varying, 'disabled'::character varying])::text[]))),
    CONSTRAINT check_fechas_validas CHECK ((fecha_fin > fecha_inicio))
);


--
-- Name: TABLE calendario_citas; Type: COMMENT; Schema: clinical; Owner: -
--

COMMENT ON TABLE clinical.calendario_citas IS 'Agenda de citas y terapias';


--
-- Name: COLUMN calendario_citas.estado; Type: COMMENT; Schema: clinical; Owner: -
--

COMMENT ON COLUMN clinical.calendario_citas.estado IS 'Estado de la cita: pendiente, confirmada, en_progreso, completada, cancelada, no_asistio';


--
-- Name: COLUMN calendario_citas.google_event_id; Type: COMMENT; Schema: clinical; Owner: -
--

COMMENT ON COLUMN clinical.calendario_citas.google_event_id IS 'ID del evento en Google Calendar';


--
-- Name: COLUMN calendario_citas.google_sync_status; Type: COMMENT; Schema: clinical; Owner: -
--

COMMENT ON COLUMN clinical.calendario_citas.google_sync_status IS 'Estado de sincronización con Google Calendar';


--
-- Name: clientes; Type: TABLE; Schema: clinical; Owner: -
--

CREATE TABLE clinical.clientes (
    id_cliente uuid NOT NULL,
    nombre character varying(100) NOT NULL,
    cedula character varying(20),
    direccion text,
    telefono character varying(20),
    email character varying(150),
    fecha_nacimiento date,
    notas text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid
);


--
-- Name: TABLE clientes; Type: COMMENT; Schema: clinical; Owner: -
--

COMMENT ON TABLE clinical.clientes IS 'Propietarios de las mascotas';


--
-- Name: consultas_clinicas; Type: TABLE; Schema: clinical; Owner: -
--

CREATE TABLE clinical.consultas_clinicas (
    id_consulta uuid NOT NULL,
    codigo_consulta character varying(20) NOT NULL,
    id_mascota uuid NOT NULL,
    id_veterinario uuid NOT NULL,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    motivo text NOT NULL,
    anamnesis text,
    examen_fisico text,
    temperatura numeric(4,2),
    peso numeric(5,2),
    diagnostico text,
    tratamiento text,
    medicamentos jsonb,
    recomendaciones text,
    proxima_cita date,
    estado character varying(20) DEFAULT 'Completada'::character varying,
    costo numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    formula_enviada_whatsapp boolean DEFAULT false,
    fecha_envio_formula timestamp with time zone,
    id_cita uuid,
    CONSTRAINT consultas_clinicas_estado_check CHECK (((estado)::text = ANY ((ARRAY['Programada'::character varying, 'En Curso'::character varying, 'Completada'::character varying, 'Cancelada'::character varying])::text[])))
);


--
-- Name: TABLE consultas_clinicas; Type: COMMENT; Schema: clinical; Owner: -
--

COMMENT ON TABLE clinical.consultas_clinicas IS 'Registro de consultas veterinarias';


--
-- Name: google_calendar_audit_log; Type: TABLE; Schema: clinical; Owner: -
--

CREATE TABLE clinical.google_calendar_audit_log (
    id integer NOT NULL,
    appointment_id uuid,
    action_type character varying(50) NOT NULL,
    details jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE google_calendar_audit_log; Type: COMMENT; Schema: clinical; Owner: -
--

COMMENT ON TABLE clinical.google_calendar_audit_log IS 'Auditoría de eventos y respuestas de Google Calendar';


--
-- Name: google_calendar_audit_log_id_seq; Type: SEQUENCE; Schema: clinical; Owner: -
--

CREATE SEQUENCE clinical.google_calendar_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: google_calendar_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: clinical; Owner: -
--

ALTER SEQUENCE clinical.google_calendar_audit_log_id_seq OWNED BY clinical.google_calendar_audit_log.id;


--
-- Name: mascotas; Type: TABLE; Schema: clinical; Owner: -
--

CREATE TABLE clinical.mascotas (
    id_mascota uuid NOT NULL,
    id_cliente uuid NOT NULL,
    nombre character varying(50) NOT NULL,
    especie character varying(30) NOT NULL,
    raza character varying(50),
    edad integer,
    sexo character varying(10),
    peso numeric(5,2),
    color character varying(50),
    fecha_nacimiento date,
    esterilizado boolean DEFAULT false,
    microchip character varying(50),
    notas text,
    foto_url text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT mascotas_sexo_check CHECK (((sexo)::text = ANY ((ARRAY['Macho'::character varying, 'Hembra'::character varying])::text[])))
);


--
-- Name: TABLE mascotas; Type: COMMENT; Schema: clinical; Owner: -
--

COMMENT ON TABLE clinical.mascotas IS 'Mascotas registradas en la clínica';


--
-- Name: vacunas_tratamientos; Type: TABLE; Schema: clinical; Owner: -
--

CREATE TABLE clinical.vacunas_tratamientos (
    id_vacuna uuid NOT NULL,
    id_mascota uuid NOT NULL,
    tipo character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    fecha_aplicacion date NOT NULL,
    proxima_dosis date,
    lote character varying(50),
    veterinario character varying(100),
    notas text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid
);


--
-- Name: TABLE vacunas_tratamientos; Type: COMMENT; Schema: clinical; Owner: -
--

COMMENT ON TABLE clinical.vacunas_tratamientos IS 'Historial de vacunas y tratamientos preventivos';


--
-- Name: cajas; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.cajas (
    id_caja uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(50) NOT NULL,
    tipo character varying(30) DEFAULT 'Personalizada'::character varying NOT NULL,
    descripcion text,
    saldo_inicial numeric(15,2) DEFAULT 0,
    saldo_actual numeric(15,2) DEFAULT 0,
    activa boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT cajas_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['Caja Menor'::character varying, 'Cuenta Bancaria'::character varying, 'Caja Fuerte'::character varying, 'Personalizada'::character varying])::text[])))
);


--
-- Name: TABLE cajas; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON TABLE financial.cajas IS 'Múltiples cajas para manejo de efectivo';


--
-- Name: categorias_egresos; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.categorias_egresos (
    id_categoria uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    activa boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE categorias_egresos; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON TABLE financial.categorias_egresos IS 'Categorías principales de egresos (EGR01, EGR02, etc.)';


--
-- Name: categorias_ingresos; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.categorias_ingresos (
    id_categoria uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    activa boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE categorias_ingresos; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON TABLE financial.categorias_ingresos IS 'Categorías principales de ingresos (ING01, ING02, etc.)';


--
-- Name: conceptos_egresos; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.conceptos_egresos (
    id_concepto uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_categoria uuid NOT NULL,
    codigo character varying(15) NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE conceptos_egresos; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON TABLE financial.conceptos_egresos IS 'Conceptos específicos dentro de cada categoría de egresos';


--
-- Name: conceptos_ingresos; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.conceptos_ingresos (
    id_concepto uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_categoria uuid NOT NULL,
    codigo character varying(15) NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE conceptos_ingresos; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON TABLE financial.conceptos_ingresos IS 'Conceptos específicos dentro de cada categoría de ingresos';


--
-- Name: control_terapias; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.control_terapias (
    id_control uuid NOT NULL,
    id_mascota uuid NOT NULL,
    id_factura uuid NOT NULL,
    id_producto uuid NOT NULL,
    tipo character varying(30) NOT NULL,
    sesiones_total integer NOT NULL,
    sesiones_usadas integer DEFAULT 0,
    sesiones_restantes integer GENERATED ALWAYS AS ((sesiones_total - sesiones_usadas)) STORED,
    fecha_inicio date DEFAULT CURRENT_DATE,
    fecha_ultima_sesion date,
    fecha_vencimiento date,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_sesiones_validas CHECK (((sesiones_usadas >= 0) AND (sesiones_usadas <= sesiones_total))),
    CONSTRAINT control_terapias_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['Individual'::character varying, 'Paquete'::character varying])::text[])))
);


--
-- Name: TABLE control_terapias; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON TABLE financial.control_terapias IS 'Control de sesiones de terapia por paquetes';


--
-- Name: egresos; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.egresos (
    id_egreso uuid NOT NULL,
    codigo_egreso character varying(20) NOT NULL,
    id_caja uuid NOT NULL,
    descripcion text NOT NULL,
    monto numeric(15,2) NOT NULL,
    categoria character varying(50) NOT NULL,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    referencia character varying(100),
    metodo_pago character varying(30) DEFAULT 'Efectivo'::character varying,
    id_orden_compra uuid,
    notas text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    id_concepto_egreso uuid,
    categoria_legacy character varying(50),
    observaciones text,
    CONSTRAINT egresos_metodo_pago_check CHECK (((metodo_pago)::text = ANY ((ARRAY['Efectivo'::character varying, 'Tarjeta'::character varying, 'Transferencia'::character varying, 'Cheque'::character varying])::text[]))),
    CONSTRAINT egresos_monto_check CHECK ((monto > (0)::numeric))
);


--
-- Name: TABLE egresos; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON TABLE financial.egresos IS 'Registro de todos los egresos por categorías';


--
-- Name: facturas_venta; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.facturas_venta (
    id_factura uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    codigo_factura character varying(20) DEFAULT public.generate_unique_code('FAC-'::text) NOT NULL,
    id_cliente uuid,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    subtotal numeric(15,2) NOT NULL,
    impuestos numeric(15,2) DEFAULT 0,
    descuento numeric(15,2) DEFAULT 0,
    total numeric(15,2) NOT NULL,
    metodo_pago character varying(30) DEFAULT 'Efectivo'::character varying,
    estado character varying(20) DEFAULT 'Pagada'::character varying,
    id_caja uuid NOT NULL,
    notas text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    whatsapp_enviado boolean DEFAULT false,
    fecha_envio_whatsapp timestamp with time zone,
    telefono_envio character varying(20),
    id_consulta uuid,
    CONSTRAINT facturas_venta_estado_check CHECK (((estado)::text = ANY ((ARRAY['Pendiente'::character varying, 'Pagada'::character varying, 'Cancelada'::character varying])::text[]))),
    CONSTRAINT facturas_venta_metodo_pago_check CHECK (((metodo_pago)::text = ANY ((ARRAY['Efectivo'::character varying, 'Tarjeta'::character varying, 'Transferencia'::character varying, 'Cheque'::character varying])::text[])))
);


--
-- Name: TABLE facturas_venta; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON TABLE financial.facturas_venta IS 'Facturas de venta a clientes';


--
-- Name: ingresos; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.ingresos (
    id_ingreso uuid NOT NULL,
    codigo_ingreso character varying(20) NOT NULL,
    id_caja uuid NOT NULL,
    descripcion text NOT NULL,
    monto numeric(15,2) NOT NULL,
    categoria character varying(50) DEFAULT 'Ventas'::character varying,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    referencia character varying(100),
    metodo_pago character varying(30) DEFAULT 'Efectivo'::character varying,
    notas text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    id_concepto_ingreso uuid,
    categoria_legacy character varying(50),
    observaciones text,
    CONSTRAINT ingresos_metodo_pago_check CHECK (((metodo_pago)::text = ANY ((ARRAY['Efectivo'::character varying, 'Tarjeta'::character varying, 'Transferencia'::character varying, 'Cheque'::character varying])::text[]))),
    CONSTRAINT ingresos_monto_check CHECK ((monto > (0)::numeric))
);


--
-- Name: TABLE ingresos; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON TABLE financial.ingresos IS 'Registro de todos los ingresos';


--
-- Name: lineas_factura; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.lineas_factura (
    id_linea uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_factura uuid NOT NULL,
    id_producto uuid NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(15,2) NOT NULL,
    descuento numeric(15,2) DEFAULT 0,
    subtotal numeric(15,2) GENERATED ALWAYS AS ((((cantidad)::numeric * precio_unitario) - descuento)) STORED,
    CONSTRAINT lineas_factura_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT lineas_factura_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric))
);


--
-- Name: lineas_orden_compra; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.lineas_orden_compra (
    id_linea uuid NOT NULL,
    id_orden uuid NOT NULL,
    id_producto uuid NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(15,2) NOT NULL,
    subtotal numeric(15,2) GENERATED ALWAYS AS (((cantidad)::numeric * precio_unitario)) STORED,
    CONSTRAINT lineas_orden_compra_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT lineas_orden_compra_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric))
);


--
-- Name: ordenes_compra; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.ordenes_compra (
    id_orden uuid NOT NULL,
    codigo_orden character varying(20) NOT NULL,
    id_proveedor uuid NOT NULL,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    total numeric(15,2) NOT NULL,
    tipo_pago character varying(20) DEFAULT 'Contado'::character varying,
    fecha_vencimiento date,
    estado character varying(20) DEFAULT 'Pendiente'::character varying,
    notas text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT ordenes_compra_estado_check CHECK (((estado)::text = ANY ((ARRAY['Pendiente'::character varying, 'Recibida'::character varying, 'Pagada'::character varying, 'Cancelada'::character varying])::text[]))),
    CONSTRAINT ordenes_compra_tipo_pago_check CHECK (((tipo_pago)::text = ANY ((ARRAY['Contado'::character varying, 'Crédito'::character varying])::text[])))
);


--
-- Name: TABLE ordenes_compra; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON TABLE financial.ordenes_compra IS 'Órdenes de compra a proveedores';


--
-- Name: productos; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.productos (
    id_producto uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    tipo character varying(30) NOT NULL,
    categoria character varying(50),
    marca character varying(100),
    precio_compra numeric(15,2),
    precio_venta numeric(15,2) NOT NULL,
    stock_actual integer DEFAULT 0,
    stock_minimo integer DEFAULT 0,
    inventariable boolean DEFAULT true NOT NULL,
    activo boolean DEFAULT true,
    sesiones_incluidas integer,
    duracion_sesion integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    codigo_barras character varying(50),
    subcategoria character varying(100),
    stock_maximo integer,
    unidad_medida character varying(50) DEFAULT 'unidad'::character varying,
    lote character varying(100),
    fecha_vencimiento date,
    ubicacion character varying(200),
    requiere_receta boolean DEFAULT false,
    iva_aplicable numeric(5,2) DEFAULT 16.00,
    CONSTRAINT check_precios_validos CHECK (((precio_venta > (0)::numeric) AND ((precio_compra IS NULL) OR (precio_compra >= (0)::numeric)))),
    CONSTRAINT productos_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['Producto'::character varying, 'Servicio'::character varying, 'Terapia Individual'::character varying, 'Terapia Paquete'::character varying])::text[])))
);


--
-- Name: TABLE productos; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON TABLE financial.productos IS 'Inventario de productos y servicios';


--
-- Name: proveedores; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.proveedores (
    id_proveedor uuid NOT NULL,
    nombre character varying(150) NOT NULL,
    nit character varying(20),
    telefono character varying(20),
    email character varying(150),
    direccion text,
    contacto_principal character varying(100),
    terminos_pago integer DEFAULT 30,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid
);


--
-- Name: TABLE proveedores; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON TABLE financial.proveedores IS 'Base de datos de proveedores';


--
-- Name: reporte_pnl; Type: VIEW; Schema: financial; Owner: -
--

CREATE VIEW financial.reporte_pnl AS
 SELECT 'INGRESOS'::text AS tipo,
    ci.codigo AS categoria_codigo,
    ci.nombre AS categoria_nombre,
    co.codigo AS concepto_codigo,
    co.nombre AS concepto_nombre,
    COALESCE(sum(ing.monto), (0)::numeric) AS total,
    count(ing.id_ingreso) AS cantidad_movimientos
   FROM ((financial.categorias_ingresos ci
     JOIN financial.conceptos_ingresos co ON ((ci.id_categoria = co.id_categoria)))
     LEFT JOIN financial.ingresos ing ON (((co.id_concepto = ing.id_concepto_ingreso) AND (ing.fecha >= date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)))))
  WHERE ((ci.activa = true) AND (co.activo = true))
  GROUP BY ci.codigo, ci.nombre, co.codigo, co.nombre
UNION ALL
 SELECT 'EGRESOS'::text AS tipo,
    ce.codigo AS categoria_codigo,
    ce.nombre AS categoria_nombre,
    co.codigo AS concepto_codigo,
    co.nombre AS concepto_nombre,
    (COALESCE(sum(egr.monto), (0)::numeric) * ('-1'::integer)::numeric) AS total,
    count(egr.id_egreso) AS cantidad_movimientos
   FROM ((financial.categorias_egresos ce
     JOIN financial.conceptos_egresos co ON ((ce.id_categoria = co.id_categoria)))
     LEFT JOIN financial.egresos egr ON (((co.id_concepto = egr.id_concepto_egreso) AND (egr.fecha >= date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)))))
  WHERE ((ce.activa = true) AND (co.activo = true))
  GROUP BY ce.codigo, ce.nombre, co.codigo, co.nombre
  ORDER BY 1, 2, 4;


--
-- Name: VIEW reporte_pnl; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON VIEW financial.reporte_pnl IS 'Vista consolidada de Pérdidas y Ganancias del mes actual';


--
-- Name: sesiones_terapia; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.sesiones_terapia (
    id_sesion uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_control uuid NOT NULL,
    fecha_sesion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    observaciones text,
    duracion_real integer,
    realizada_por uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE sesiones_terapia; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON TABLE financial.sesiones_terapia IS 'Registro individual de cada sesión de terapia realizada';


--
-- Name: transferencias_cajas; Type: TABLE; Schema: financial; Owner: -
--

CREATE TABLE financial.transferencias_cajas (
    id_transferencia uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    codigo_transferencia character varying(20) DEFAULT public.generate_unique_code('TRF-'::text) NOT NULL,
    id_caja_origen uuid NOT NULL,
    id_caja_destino uuid NOT NULL,
    monto numeric(15,2) NOT NULL,
    descripcion text NOT NULL,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metodo_pago character varying(30) DEFAULT 'Efectivo'::character varying,
    estado character varying(20) DEFAULT 'Completada'::character varying,
    notas text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT transferencias_cajas_diferentes CHECK ((id_caja_origen <> id_caja_destino)),
    CONSTRAINT transferencias_cajas_estado_check CHECK (((estado)::text = ANY ((ARRAY['Completada'::character varying, 'Cancelada'::character varying])::text[]))),
    CONSTRAINT transferencias_cajas_metodo_pago_check CHECK (((metodo_pago)::text = ANY ((ARRAY['Efectivo'::character varying, 'Transferencia'::character varying])::text[]))),
    CONSTRAINT transferencias_cajas_monto_check CHECK ((monto > (0)::numeric))
);


--
-- Name: TABLE transferencias_cajas; Type: COMMENT; Schema: financial; Owner: -
--

COMMENT ON TABLE financial.transferencias_cajas IS 'Registro de transferencias de dinero entre cajas';


--
-- Name: v_productos_stock_bajo; Type: VIEW; Schema: financial; Owner: -
--

CREATE VIEW financial.v_productos_stock_bajo AS
 SELECT p.id_producto,
    p.codigo,
    p.nombre,
    p.stock_actual,
    p.stock_minimo,
    (p.stock_minimo - p.stock_actual) AS cantidad_requerida
   FROM financial.productos p
  WHERE ((p.inventariable = true) AND (p.activo = true) AND (p.stock_actual <= p.stock_minimo));


--
-- Name: v_saldos_cajas; Type: VIEW; Schema: financial; Owner: -
--

CREATE VIEW financial.v_saldos_cajas AS
 SELECT c.id_caja,
    c.nombre,
    c.tipo,
    c.saldo_actual,
    COALESCE(i.total_ingresos, (0)::numeric) AS total_ingresos,
    COALESCE(e.total_egresos, (0)::numeric) AS total_egresos,
    c.updated_at
   FROM ((financial.cajas c
     LEFT JOIN ( SELECT ingresos.id_caja,
            sum(ingresos.monto) AS total_ingresos
           FROM financial.ingresos
          GROUP BY ingresos.id_caja) i ON ((c.id_caja = i.id_caja)))
     LEFT JOIN ( SELECT egresos.id_caja,
            sum(egresos.monto) AS total_egresos
           FROM financial.egresos
          GROUP BY egresos.id_caja) e ON ((c.id_caja = e.id_caja)))
  WHERE (c.activa = true);


--
-- Name: usuarios; Type: TABLE; Schema: vetplus_auth; Owner: -
--

CREATE TABLE vetplus_auth.usuarios (
    id_usuario uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    documento character varying(20) NOT NULL,
    tipo_documento character varying(10) NOT NULL,
    telefono character varying(20),
    direccion text,
    password_hash character varying(255) NOT NULL,
    rol character varying(20) NOT NULL,
    especialidad character varying(100),
    numero_licencia character varying(50),
    activo boolean DEFAULT true,
    ultimo_login timestamp without time zone,
    intentos_login integer DEFAULT 0,
    bloqueado_hasta timestamp without time zone,
    password_temporal boolean DEFAULT false,
    debe_cambiar_password boolean DEFAULT false,
    password_reset_date timestamp without time zone,
    password_reset_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY ((ARRAY['admin'::character varying, 'vet'::character varying, 'aux_admin'::character varying, 'aux_vet'::character varying])::text[]))),
    CONSTRAINT usuarios_tipo_documento_check CHECK (((tipo_documento)::text = ANY ((ARRAY['CC'::character varying, 'CE'::character varying, 'Pasaporte'::character varying])::text[])))
);


--
-- Name: TABLE usuarios; Type: COMMENT; Schema: vetplus_auth; Owner: -
--

COMMENT ON TABLE vetplus_auth.usuarios IS 'Usuarios del sistema con roles admin, vet, aux';


--
-- Name: COLUMN usuarios.password_temporal; Type: COMMENT; Schema: vetplus_auth; Owner: -
--

COMMENT ON COLUMN vetplus_auth.usuarios.password_temporal IS 'Indica si la contraseña es temporal y debe cambiarse';


--
-- Name: COLUMN usuarios.password_reset_date; Type: COMMENT; Schema: vetplus_auth; Owner: -
--

COMMENT ON COLUMN vetplus_auth.usuarios.password_reset_date IS 'Fecha del último reset de contraseña';


--
-- Name: COLUMN usuarios.password_reset_by; Type: COMMENT; Schema: vetplus_auth; Owner: -
--

COMMENT ON COLUMN vetplus_auth.usuarios.password_reset_by IS 'Admin que realizó el último reset';


--
-- Name: blacklisted_tokens; Type: TABLE; Schema: vetplus_auth; Owner: -
--

CREATE TABLE vetplus_auth.blacklisted_tokens (
    id_token uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    token text NOT NULL,
    id_usuario uuid,
    razon character varying(50) DEFAULT 'logout'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: google_calendar_config; Type: TABLE; Schema: vetplus_auth; Owner: -
--

CREATE TABLE vetplus_auth.google_calendar_config (
    id_config uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id character varying(255) NOT NULL,
    client_secret character varying(255) NOT NULL,
    redirect_uri character varying(255) NOT NULL,
    refresh_token text,
    access_token text,
    token_expiry timestamp with time zone,
    calendar_id character varying(255) DEFAULT 'primary'::character varying,
    timezone character varying(50) DEFAULT 'America/Bogota'::character varying,
    notification_email boolean DEFAULT true,
    notification_popup boolean DEFAULT true,
    default_reminder_minutes integer DEFAULT 30,
    email_reminder_hours integer DEFAULT 24,
    is_active boolean DEFAULT false,
    configured_by uuid,
    webhook_channel_id character varying(100),
    webhook_url text,
    webhook_expiration timestamp with time zone,
    webhook_resource_id character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: password_resets; Type: TABLE; Schema: vetplus_auth; Owner: -
--

CREATE TABLE vetplus_auth.password_resets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_usuario uuid NOT NULL,
    tipo_reset character varying(50) DEFAULT 'temp_password'::character varying NOT NULL,
    realizado_por uuid,
    motivo character varying(255),
    completado boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    CONSTRAINT password_resets_tipo_reset_check CHECK (((tipo_reset)::text = ANY ((ARRAY['temp_password'::character varying, 'admin_reset'::character varying, 'force_change'::character varying, 'user_change'::character varying])::text[])))
);


--
-- Name: TABLE password_resets; Type: COMMENT; Schema: vetplus_auth; Owner: -
--

COMMENT ON TABLE vetplus_auth.password_resets IS 'Historial de resets de contraseña por administradores';


--
-- Name: sesiones; Type: TABLE; Schema: vetplus_auth; Owner: -
--

CREATE TABLE vetplus_auth.sesiones (
    id_sesion uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_usuario uuid NOT NULL,
    token_jti character varying(255) NOT NULL,
    ip_address inet,
    user_agent text,
    expira_en timestamp without time zone NOT NULL,
    revocado boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE sesiones; Type: COMMENT; Schema: vetplus_auth; Owner: -
--

COMMENT ON TABLE vetplus_auth.sesiones IS 'Control de sesiones JWT activas';


--
-- Name: google_calendar_audit_log id; Type: DEFAULT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.google_calendar_audit_log ALTER COLUMN id SET DEFAULT nextval('clinical.google_calendar_audit_log_id_seq'::regclass);


--
-- Data for Name: calendario_citas; Type: TABLE DATA; Schema: clinical; Owner: -
--

COPY clinical.calendario_citas (id_cita, codigo_cita, id_mascota, id_veterinario, tipo, estado, motivo, notas, recordatorio_enviado, id_consulta, google_event_id, created_at, updated_at, created_by, google_sync_status, google_sync_error, last_google_sync, fecha_inicio, fecha_fin) FROM stdin;
ec4e5c0b-b045-4b97-818e-11fcba6bbd36	GCL-82156144	652880fc-5b8d-4150-b54f-75afaf7d1048	612b7d82-bf59-489a-8e1b-97c7dad91717	consulta_general	pendiente	Consulta de prueba - Verificación webhook Google Calendar	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: luna\n👤 Cliente: Juliana Jimenez\n👨‍⚕️ Veterinario: maria fernanda\n📋 Tipo: consulta_general\n📝 Motivo: Consulta de prueba - Verificación webhook Google Calendar\n\nCódigo de cita: CIT-71979218	f	\N	h12h82q0ane1822l2c8r1pggv8	2025-09-13 11:49:16.144504	2025-09-13 11:49:16.347687	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	2025-09-13 11:49:16.347687-05	2025-09-15 09:00:00	2025-09-15 10:00:00
eb7c64e6-d4af-40db-8462-d07c92dd4650	GCL-82259595	c8ece1d9-d7db-4f38-b88a-ec9673c2f70d	612b7d82-bf59-489a-8e1b-97c7dad91717	consulta_general	pendiente	No especificado	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: candela\n👤 Cliente: Diego Sanchez\n👨‍⚕️ Veterinario: Juan Veterinario\n📋 Tipo: consulta_general\n📝 Motivo: No especificado\n\nCódigo de cita: CIT-01022074	f	\N	e6ef8muaehju5omin66b4qn4p4	2025-09-13 11:50:59.595706	2025-09-13 11:50:59.595706	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-02 13:00:00	2025-08-02 13:30:00
7adc1477-883d-46a8-b406-582ed324ca92	GCL-82259603	ca240981-2fa8-43ca-8160-bc82e003d0d9	612b7d82-bf59-489a-8e1b-97c7dad91717	vacunacion	pendiente	No especificado	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: Rex\n👤 Cliente: María García\n👨‍⚕️ Veterinario: Juan Veterinario\n📋 Tipo: vacunacion\n📝 Motivo: No especificado\n\nCódigo de cita: CIT-02687381	f	\N	1n03frl1s2imlqens7r0h7s1c8	2025-09-13 11:50:59.604177	2025-09-13 11:50:59.604177	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-09 04:00:00	2025-08-09 04:15:00
585dcdb4-63b5-4cbe-9d88-51a6c94c8fe4	GCL-82259611	53357b79-03e6-48df-b1d8-ab3d2bbd769b	612b7d82-bf59-489a-8e1b-97c7dad91717	consulta_general	pendiente	revision	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: pantera\n👤 Cliente: Juliana Jimenez\n👨‍⚕️ Veterinario: maria fernanda\n📋 Tipo: consulta_general\n📝 Motivo: revision\n\nCódigo de cita: CIT-22573058	f	\N	qknrbp88jsm4m6jnpcrc9pvbos	2025-09-13 11:50:59.611835	2025-09-13 11:50:59.611835	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-12 22:00:00	2025-08-12 22:30:00
4eee745d-f53c-498a-83e3-7956adff9a5c	GCL-82259616	c8ece1d9-d7db-4f38-b88a-ec9673c2f70d	612b7d82-bf59-489a-8e1b-97c7dad91717	consulta_general	pendiente	hormiga	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: candela\n👤 Cliente: Diego Sanchez\n👨‍⚕️ Veterinario: Juan Veterinario\n📋 Tipo: consulta_general\n📝 Motivo: hormiga\n\nCódigo de cita: CIT-41643517	f	\N	ql8pk7vkas25hlalpjp749dl4k	2025-09-13 11:50:59.616565	2025-09-13 11:50:59.616565	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-13 08:00:00	2025-08-13 08:30:00
24ffdfda-e022-4d44-afad-1436fa599fe9	GCL-82259621	a1556b25-32b1-4040-9bcc-65a3fe7e82c6	612b7d82-bf59-489a-8e1b-97c7dad91717	revision	pendiente	Encuentro con un perro, sangrado en ala.	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: shiny\n👤 Cliente: Diego Sanchez\n👨‍⚕️ Veterinario: maria fernanda\n📋 Tipo: revision\n📝 Motivo: Encuentro con un perro, sangrado en ala.\n\nCódigo de cita: CIT-41598184	f	\N	vop0mtatobs5489uc7e6rg98os	2025-09-13 11:50:59.62173	2025-09-13 11:50:59.62173	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-13 09:00:00	2025-08-13 09:45:00
a81f5704-bdaf-4233-ab16-841846559bbc	GCL-82259628	c8ece1d9-d7db-4f38-b88a-ec9673c2f70d	612b7d82-bf59-489a-8e1b-97c7dad91717	consulta_general	pendiente	Hormiga no come	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: candela\n👤 Cliente: Diego Sanchez\n👨‍⚕️ Veterinario: maria fernanda\n📋 Tipo: consulta_general\n📝 Motivo: Hormiga no come\n\nCódigo de cita: CIT-44945719	f	\N	6ki2tvli9mg6q550lfnecj6dlk	2025-09-13 11:50:59.628798	2025-09-13 11:50:59.628798	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-13 11:00:00	2025-08-13 11:30:00
e83b67f3-41bf-41ee-bbb3-f0f8cf798106	GCL-82259636	652880fc-5b8d-4150-b54f-75afaf7d1048	612b7d82-bf59-489a-8e1b-97c7dad91717	otro	pendiente	Poner a Luna a dieta	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: luna\n👤 Cliente: Juliana Jimenez\n👨‍⚕️ Veterinario: maria fernanda\n📋 Tipo: otro\n📝 Motivo: Poner a Luna a dieta\n\nCódigo de cita: CIT-07978489	f	\N	84hde1sj4th52ci8dmjujniaq4	2025-09-13 11:50:59.636318	2025-09-13 11:50:59.636318	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-14 08:00:00	2025-08-14 08:30:00
e6516b6d-5f63-4eeb-953f-16307d591b20	GCL-82259640	a1556b25-32b1-4040-9bcc-65a3fe7e82c6	612b7d82-bf59-489a-8e1b-97c7dad91717	control	pendiente	No especificado	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: shiny\n👤 Cliente: Diego Sanchez\n👨‍⚕️ Veterinario: Juan Veterinario\n📋 Tipo: control\n📝 Motivo: No especificado\n\nCódigo de cita: CIT-08352919	f	\N	d0sfa8u0c7thci8acenp8v1gbo	2025-09-13 11:50:59.641256	2025-09-13 11:50:59.641256	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-14 08:00:00	2025-08-14 08:20:00
13ed58d2-d0f0-47f8-8b89-67c66cf4ccc4	GCL-82259644	45075ef9-5848-4d18-9d13-e5a173d1c3a8	612b7d82-bf59-489a-8e1b-97c7dad91717	consulta_general	pendiente	lesion lumbosacra	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: king jimenez\n👤 Cliente: cesar jimenez\n👨‍⚕️ Veterinario: maria fernanda\n📋 Tipo: consulta_general\n📝 Motivo: lesion lumbosacra\n\nCódigo de cita: CIT-94747258	f	\N	i97htfgvb9gmep7684mbdt1n58	2025-09-13 11:50:59.644756	2025-09-13 11:50:59.644756	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-14 17:00:00	2025-08-14 17:30:00
d4f6d2e8-b48a-42a9-8f18-bd4429a19e50	GCL-82259649	fdab6850-337a-4b01-910c-1424e4bd9e0c	612b7d82-bf59-489a-8e1b-97c7dad91717	vacunacion	pendiente	vacuna periodica	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: bombom\n👤 Cliente: Diego Sanchez\n👨‍⚕️ Veterinario: maria fernanda\n📋 Tipo: vacunacion\n📝 Motivo: vacuna periodica\n\nCódigo de cita: CIT-20894211	f	\N	v63qvdpn3dk1s3le29u4qlp0i8	2025-09-13 11:50:59.649156	2025-09-13 11:50:59.649156	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-16 08:00:00	2025-08-16 08:15:00
fa57a0bb-4426-4ef2-aaed-4b8413027d37	GCL-82259652	c8ece1d9-d7db-4f38-b88a-ec9673c2f70d	612b7d82-bf59-489a-8e1b-97c7dad91717	consulta_general	pendiente	revision	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: candela\n👤 Cliente: Diego Sanchez\n👨‍⚕️ Veterinario: maria fernanda\n📋 Tipo: consulta_general\n📝 Motivo: revision\n\nCódigo de cita: CIT-43085616	f	\N	a2s8mngee1kkpsbhl2l1tpt1mg	2025-09-13 11:50:59.653129	2025-09-13 11:50:59.653129	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-17 11:00:00	2025-08-17 11:30:00
d6f59f2f-606f-49b2-8088-f5c3ee50b2b5	GCL-82259656	53357b79-03e6-48df-b1d8-ab3d2bbd769b	612b7d82-bf59-489a-8e1b-97c7dad91717	consulta_general	pendiente	No especificado	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: pantera\n👤 Cliente: Juliana Jimenez\n👨‍⚕️ Veterinario: Juan Veterinario\n📋 Tipo: consulta_general\n📝 Motivo: No especificado\n\nCódigo de cita: CIT-52742460	f	\N	j4bibffvn1d1djqkc7ge5a4ufk	2025-09-13 11:50:59.656947	2025-09-13 11:50:59.656947	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-17 11:30:00	2025-08-17 12:00:00
c250b1d1-78a8-470c-83a0-8ca055b5d502	GCL-82259661	a1556b25-32b1-4040-9bcc-65a3fe7e82c6	612b7d82-bf59-489a-8e1b-97c7dad91717	consulta_general	pendiente	revision	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: shiny\n👤 Cliente: Diego Sanchez\n👨‍⚕️ Veterinario: maria fernanda\n📋 Tipo: consulta_general\n📝 Motivo: revision\n\nCódigo de cita: CIT-46277333	f	\N	rtodv0buah8f0s26fgq59pii44	2025-09-13 11:50:59.661339	2025-09-13 11:50:59.661339	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-19 03:00:00	2025-08-19 03:45:00
609f02f2-2865-4c32-9463-a563f64fedef	GCL-82259665	a1556b25-32b1-4040-9bcc-65a3fe7e82c6	612b7d82-bf59-489a-8e1b-97c7dad91717	consulta_general	pendiente	No especificado	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: shiny\n👤 Cliente: Diego Sanchez\n👨‍⚕️ Veterinario: maria fernanda\n📋 Tipo: consulta_general\n📝 Motivo: No especificado\n\nCódigo de cita: CIT-85485915	f	\N	ifgneqsvbc0grrlso631ls1udo	2025-09-13 11:50:59.666331	2025-09-13 11:50:59.666331	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-22 12:30:00	2025-08-22 13:00:00
1b650e61-f5d7-4798-aa4a-fcbf6cc46caf	GCL-82259670	a1556b25-32b1-4040-9bcc-65a3fe7e82c6	612b7d82-bf59-489a-8e1b-97c7dad91717	vacunacion	pendiente	No especificado	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: shiny\n👤 Cliente: Diego Sanchez\n👨‍⚕️ Veterinario: Juan Carlos\n📋 Tipo: vacunacion\n📝 Motivo: No especificado\n\nCódigo de cita: CIT-58165253	f	\N	41nvrbqrrgnh2tvhic667h00b0	2025-09-13 11:50:59.670193	2025-09-13 11:50:59.670193	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	\N	2025-08-27 03:00:00	2025-08-27 03:30:00
7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	CIT-85533697	fdab6850-337a-4b01-910c-1424e4bd9e0c	fc6a9e30-0796-47d8-904d-ef2f1eaa0b20	control	cancelada	otro control	  | Cliente confirmó asistencia desde Google Calendar  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cliente canceló desde Google Calendar	f	\N	1ej8dr0ac88oidc77gdc6plsgc	2025-09-13 12:45:33.702814	2025-09-13 16:10:52.734291	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	synced	\N	2025-09-13 12:45:34.237915-05	2025-09-13 16:00:00	2025-09-13 16:20:00
d06f3df6-ec60-4769-b54c-56cdf59bc805	GCL-82156117	a1556b25-32b1-4040-9bcc-65a3fe7e82c6	612b7d82-bf59-489a-8e1b-97c7dad91717	vacunacion	cancelada	dgfhdjf	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: shiny\n👤 Cliente: Diego Sanchez\n👨‍⚕️ Veterinario: Juan Carlos\n📋 Tipo: vacunacion\n📝 Motivo: dgfhdjf\n\nCódigo de cita: CIT-76997372  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.	f	\N	bllva7mjfaib7kri4d1qbqspl4	2025-09-13 11:49:16.117785	2025-09-13 16:10:52.734291	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	2025-09-13 13:01:42.548165-05	2025-09-13 16:00:00	2025-09-13 16:30:00
b6849a37-61fd-495c-aded-20d036a264dd	GCL-82859815	fdab6850-337a-4b01-910c-1424e4bd9e0c	612b7d82-bf59-489a-8e1b-97c7dad91717	vacunacion	cancelada	Vacuna antirabica	Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus\n\n🐕 Mascota: bombom\n👤 Cliente: Diego Sanchez\n👨‍⚕️ Veterinario: Juan Carlos\n📋 Tipo: vacunacion\n📝 Motivo: Vacuna antirabica\n\nCódigo de cita: GCL-82156134 | Cliente canceló desde Google Calendar	f	\N	liciivg43iuib88mnnf6u6enjo	2025-09-13 12:00:59.815917	2025-09-13 16:55:22.526733	612b7d82-bf59-489a-8e1b-97c7dad91717	synced	\N	2025-09-13 12:01:00.011106-05	2025-09-13 11:00:00	2025-09-13 11:15:00
5fe72af3-ac2d-47c9-bf8c-17233329e742	CIT-82924801	fdab6850-337a-4b01-910c-1424e4bd9e0c	612b7d82-bf59-489a-8e1b-97c7dad91717	control	en_curso	Fiebre despues de vacuna	\N	f	76c12acf-e5a2-45b6-b399-6a49dbfdcab8	b8rn8cmatm4al4e6j9ertr7a6s	2025-09-13 12:02:04.805901	2025-09-13 16:00:27.201603	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	synced	\N	2025-09-13 12:09:24.163382-05	2025-09-13 14:30:00	2025-09-13 14:50:00
6d3668a5-160a-464f-97ae-5e1bc225cdd8	CIT-97490149	fdab6850-337a-4b01-910c-1424e4bd9e0c	fc6a9e30-0796-47d8-904d-ef2f1eaa0b20	emergencia	cancelada	Urgencia	 | Cliente canceló desde Google Calendar | Cliente confirmó asistencia desde Google Calendar | Cliente marcó como tentativo desde Google Calendar	f	\N	\N	2025-09-13 16:04:50.155692	2025-09-13 16:53:45.113836	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	synced	\N	2025-09-13 16:53:45.113836-05	2025-09-13 19:00:00	2025-09-13 19:45:00
93748851-5028-4b86-9ac4-6ea615738bf6	CIT-00665440	b9be9992-6c5d-488d-8994-c2d461b13c9d	fc6a9e30-0796-47d8-904d-ef2f1eaa0b20	vacunacion	en_curso	\N	Cliente confirmó asistencia desde Google Calendar	f	02bf17fa-71e3-4352-82ed-80eb0fc13394	d432ratp3r3e5a4koomfimdrh8	2025-09-13 16:57:45.443589	2025-09-13 19:00:36.420004	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	synced	\N	2025-09-13 16:57:45.871051-05	2025-09-13 19:30:00	2025-09-13 19:45:00
eeba7fe2-49c1-400a-8907-a13f0cc888c7	CIT-00560006	fdab6850-337a-4b01-910c-1424e4bd9e0c	fc6a9e30-0796-47d8-904d-ef2f1eaa0b20	consulta_general	cancelada	\N	Cliente canceló desde Google Calendar	f	\N	b7vtnq6cs2lb09lsunl00goj3k	2025-09-13 16:56:00.010801	2025-09-13 16:57:09.852732	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	synced	\N	2025-09-13 16:56:00.501334-05	2025-09-13 19:30:00	2025-09-13 20:00:00
739d0798-df60-492c-b99e-4e4a0942a1bf	CIT-85265429	fdab6850-337a-4b01-910c-1424e4bd9e0c	fc6a9e30-0796-47d8-904d-ef2f1eaa0b20	control	completada	sigue enferma	 | Cliente canceló desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar	f	f718e110-3bd3-4490-9cde-c87e87babb7b	grjlblpbik17cpn18sa66hbk8s	2025-09-13 12:41:05.432032	2025-09-13 17:56:18.393944	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	synced	\N	2025-09-13 17:02:07.405219-05	2025-09-13 17:00:00	2025-09-13 17:20:00
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: clinical; Owner: -
--

COPY clinical.clientes (id_cliente, nombre, cedula, direccion, telefono, email, fecha_nacimiento, notas, activo, created_at, updated_at, created_by) FROM stdin;
46b889c7-d434-4653-94aa-8afe597b2a9e	Juan Pérez	\N	Calle 123	555-1234	juan@example.com	\N	\N	t	2025-07-22 13:10:34.641926	2025-07-22 13:10:34.641926	\N
a3cf6a46-197b-4b36-9598-00d54c022113	María García	12345678	Calle 123 #45-67, Bogotá	3001234567	maria.garcia@example.com	\N	\N	t	2025-07-22 18:49:57.122467	2025-07-22 18:49:57.122467	\N
e3035062-aeb0-44cc-8c46-b7780aedeeaa	Carlos Rodríguez	87654321	Carrera 45 #12-34, Medellín	3159876543	carlos.rodriguez@example.com	\N	Cliente VIP - descuento 10%	t	2025-07-22 18:51:19.445024	2025-07-22 18:51:19.445024	\N
df6a46d1-cc0d-4ae5-a4a4-a6b4eea50b4c	Ana María González	52987654	Calle 85 #15-30	3005559876	ana.gonzalez@email.com	1985-05-15	\N	t	2025-07-22 20:06:20.743146	2025-07-22 20:06:20.743146	\N
bb56cbdd-f2a9-43ab-ad46-b72880579e5d	Juan Perez	\N	\N	123456789	juan@test.com	\N	\N	t	2025-08-01 20:34:48.86339	2025-08-01 20:34:48.86339	\N
e8504adb-a6c1-4497-87de-b40acbfcc608	Juan Perez	0987654	\N	123456789	juan@test.com	\N	\N	t	2025-08-01 20:35:10.393366	2025-08-12 12:50:33.084215	\N
7ca0ff53-1693-49db-ba11-0515e6a5fe15	Juliana Jimenez	30399617	\N	311660600	julianajimenez817@hotmail.com	\N	\N	t	2025-07-28 13:17:21.447848	2025-08-14 18:31:41.234795	\N
955efa64-eee8-4d6b-9e6f-5934ce9ba475	cesar jimenez	75100663	cale 69 # 28 c 55	3104618307	cjimenez0202@gmail.com	\N	\N	t	2025-08-14 13:03:36.63787	2025-08-14 18:33:06.280375	\N
21176cd5-7e32-4c15-815b-b8917617f778	Diego Sanchez	1054988359	calle 69 28c55	3052621653	rikyd2010@hotmail.com	\N	\N	t	2025-07-26 18:31:42.285952	2025-08-14 19:23:27.779422	\N
770eda86-f13a-4e87-a124-800bd5a68360	Test Cliente	\N	\N	123456789	\N	\N	\N	t	2025-08-01 20:44:47.247808	2025-08-14 19:24:27.880743	\N
\.


--
-- Data for Name: consultas_clinicas; Type: TABLE DATA; Schema: clinical; Owner: -
--

COPY clinical.consultas_clinicas (id_consulta, codigo_consulta, id_mascota, id_veterinario, fecha, motivo, anamnesis, examen_fisico, temperatura, peso, diagnostico, tratamiento, medicamentos, recomendaciones, proxima_cita, estado, costo, created_at, updated_at, formula_enviada_whatsapp, fecha_envio_formula, id_cita) FROM stdin;
76c12acf-e5a2-45b6-b399-6a49dbfdcab8	CON-97227231	fdab6850-337a-4b01-910c-1424e4bd9e0c	612b7d82-bf59-489a-8e1b-97c7dad91717	2025-09-13 16:00:27.201603	Fiebre despues de vacuna	\N	\N	\N	\N	\N	\N	\N	\N	\N	En Curso	\N	2025-09-13 16:00:27.201603	2025-09-13 16:00:27.201603	f	\N	\N
02bf17fa-71e3-4352-82ed-80eb0fc13394	CON-08036548	b9be9992-6c5d-488d-8994-c2d461b13c9d	fc6a9e30-0796-47d8-904d-ef2f1eaa0b20	2025-09-13 19:00:36.420004	Consulta programada	\N	\N	\N	\N	\N	\N	\N	\N	\N	En Curso	\N	2025-09-13 19:00:36.420004	2025-09-13 19:00:36.420004	f	\N	\N
f718e110-3bd3-4490-9cde-c87e87babb7b	CON-04178431	fdab6850-337a-4b01-910c-1424e4bd9e0c	fc6a9e30-0796-47d8-904d-ef2f1eaa0b20	2025-09-13 17:56:18.393944	sigue enferma	\N	\N	30.00	30.00	fiebre postvacuna	medicamento segun formula	[]	\N	2025-09-22	Completada	\N	2025-09-13 17:56:18.393944	2025-09-13 20:41:46.276611	f	\N	\N
\.


--
-- Data for Name: google_calendar_audit_log; Type: TABLE DATA; Schema: clinical; Owner: -
--

COPY clinical.google_calendar_audit_log (id, appointment_id, action_type, details, created_at) FROM stdin;
1	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 12:56:28.054001
2	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 12:56:28.065992
3	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 13:04:38.778625
4	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 13:07:25.161108
5	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 13:09:03.46836
6	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 13:10:19.431991
7	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:36:25.732882
8	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:36:25.739717
9	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:36:25.741582
10	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:38:47.734407
11	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:38:47.741571
12	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:38:47.747612
13	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:41:05.537603
14	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:41:05.544001
15	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:41:05.546402
16	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:41:31.71618
17	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:41:31.722995
18	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:41:31.724917
19	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:41:39.430855
20	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:41:39.438411
21	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:41:39.439819
22	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:41:46.02589
23	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:41:46.031726
24	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:41:46.034471
25	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:44:57.152219
26	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:44:57.161614
27	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:44:57.164182
28	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:51:45.945547
29	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:51:45.964708
30	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 14:51:45.967765
31	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:04:22.874011
32	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:04:23.011933
33	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:04:23.019985
34	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:04:37.943699
35	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:04:37.951995
36	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:04:37.955072
37	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:06:52.373762
38	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:06:52.379026
39	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:06:52.391012
40	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:07:36.015203
41	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:07:36.021108
42	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:07:36.025671
43	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:07:46.238216
44	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:07:46.24338
45	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:07:46.249499
46	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:13:24.904555
47	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:13:24.91672
48	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:13:24.918364
49	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:16:22.139242
50	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:16:22.147264
51	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:16:22.149106
52	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:21:24.184524
53	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:21:24.190338
54	d06f3df6-ec60-4769-b54c-56cdf59bc805	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 15:21:24.19541
55	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:04:21.121427
56	7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:04:21.131819
57	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:05:39.347345
58	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:18:02.440159
59	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:24:08.56546
60	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:30:42.210386
61	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:37:31.747367
62	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:42:51.351295
63	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "tentative", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:43:38.554639
64	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "tentative", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:46:11.116208
65	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:50:01.635702
66	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "tentative", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:50:23.110082
67	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:51:49.079041
68	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "tentative", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:52:06.904686
69	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "tentative", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:52:43.828998
70	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "tentative", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:53:00.790335
71	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:53:16.612471
72	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:53:26.35226
73	6d3668a5-160a-464f-97ae-5e1bc225cdd8	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:53:35.080173
74	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:54:52.661392
75	b6849a37-61fd-495c-aded-20d036a264dd	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:54:52.675113
76	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:55:15.325554
77	b6849a37-61fd-495c-aded-20d036a264dd	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:55:15.333306
78	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:55:19.319047
79	b6849a37-61fd-495c-aded-20d036a264dd	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:55:19.332309
80	739d0798-df60-492c-b99e-4e4a0942a1bf	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:55:22.517235
81	b6849a37-61fd-495c-aded-20d036a264dd	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:55:22.528134
82	eeba7fe2-49c1-400a-8907-a13f0cc888c7	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:56:31.333506
83	eeba7fe2-49c1-400a-8907-a13f0cc888c7	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:57:03.513375
84	eeba7fe2-49c1-400a-8907-a13f0cc888c7	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:57:09.854804
85	93748851-5028-4b86-9ac4-6ea615738bf6	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:58:41.126399
86	93748851-5028-4b86-9ac4-6ea615738bf6	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 16:59:52.824652
87	93748851-5028-4b86-9ac4-6ea615738bf6	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 17:00:22.194096
88	93748851-5028-4b86-9ac4-6ea615738bf6	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 17:00:33.1701
89	93748851-5028-4b86-9ac4-6ea615738bf6	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 17:00:58.555771
90	93748851-5028-4b86-9ac4-6ea615738bf6	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 17:01:15.882616
91	93748851-5028-4b86-9ac4-6ea615738bf6	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 17:01:29.722836
92	93748851-5028-4b86-9ac4-6ea615738bf6	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 17:01:44.80704
93	93748851-5028-4b86-9ac4-6ea615738bf6	attendee_response	{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}	2025-09-13 17:01:50.48167
\.


--
-- Data for Name: mascotas; Type: TABLE DATA; Schema: clinical; Owner: -
--

COPY clinical.mascotas (id_mascota, id_cliente, nombre, especie, raza, edad, sexo, peso, color, fecha_nacimiento, esterilizado, microchip, notas, foto_url, activo, created_at, updated_at, created_by) FROM stdin;
0ea2fae5-0065-489b-84fe-24290a924476	a3cf6a46-197b-4b36-9598-00d54c022113	Test	Perro	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	t	2025-07-22 19:16:04.114527	2025-07-22 19:16:04.114527	\N
479b06e2-5f26-42a7-94ed-15c7b0fdff84	a3cf6a46-197b-4b36-9598-00d54c022113	Test Direct	Perro	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	t	2025-07-22 19:22:39.43412	2025-07-22 19:22:39.43412	\N
a353538f-4e3c-4dbc-80e6-5310c566a954	a3cf6a46-197b-4b36-9598-00d54c022113	Test Pet	Perro	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	t	2025-07-22 19:30:10.516225	2025-07-22 19:30:10.516225	\N
e1d0cd75-821a-4e43-9ca1-42c6346ce3e4	a3cf6a46-197b-4b36-9598-00d54c022113	Luna	Gato	Persa	18	Hembra	4.20	Blanco	2023-07-01	t	DEF987654321	\N	\N	t	2025-07-22 19:39:38.132196	2025-07-22 19:39:38.132196	\N
db9c84a3-b694-4330-8f5e-f5f991e57e31	e3035062-aeb0-44cc-8c46-b7780aedeeaa	Luna Mejorada	Perro	Golden Retriever	5	Hembra	22.50	Dorado	2020-03-14	t	987654321XYZ	\N	\N	t	2025-07-22 19:58:59.320036	2025-07-22 19:58:59.320036	\N
e6e11b51-620d-43bb-af15-f73408dddaa3	df6a46d1-cc0d-4ae5-a4a4-a6b4eea50b4c	Princesa	Gato	Persa	6	Hembra	4.20	Blanco	2019-03-09	t	PRS123456789	\N	\N	t	2025-07-22 20:06:36.618326	2025-07-22 20:06:36.618326	\N
ca847547-6153-48dd-b0d4-1dc5b938821a	df6a46d1-cc0d-4ae5-a4a4-a6b4eea50b4c	Rocky Cachorro	Perro	Labrador	0	Macho	8.50	Chocolate	2024-10-14	f	PUPPY123456789	\N	\N	t	2025-07-22 20:13:41.564594	2025-07-22 20:13:41.564594	\N
ad983cd2-79a6-4355-9fe1-eef351409c33	770eda86-f13a-4e87-a124-800bd5a68360	Test Mascota	Perro	\N	\N	Macho	\N	\N	\N	f	\N	\N	/uploads/pacientes/mascota-ad983cd2-79a6-4355-9fe1-eef351409c33-1755217467928.jpeg	t	2025-08-01 20:44:47.247808	2025-08-14 19:24:27.93052	\N
fc7eb1dc-7a39-40cd-8b2a-b647f4340d61	46b889c7-d434-4653-94aa-8afe597b2a9e	Firulais	Perro	Labrador	\N	Macho	25.50	Dorado	2020-01-15	f	\N	\N	\N	t	2025-07-22 13:10:34.641926	2025-07-26 19:32:43.304373	\N
652880fc-5b8d-4150-b54f-75afaf7d1048	7ca0ff53-1693-49db-ba11-0515e6a5fe15	luna	Hamster	Ruso	0	Hembra	0.20	marron	2025-05-01	f	\N	lunita esposa de mini benji	\N	t	2025-07-28 13:17:21.447848	2025-08-14 18:31:41.234795	\N
019c9f0e-3d1e-4b61-b4af-b441768de067	a3cf6a46-197b-4b36-9598-00d54c022113	Mochi	Gato	Siamés	12	Hembra	3.80	Crema	2024-01-01	t	GHI345678901	\N	\N	t	2025-07-22 19:43:55.285073	2025-07-26 19:44:36.09615	\N
45075ef9-5848-4d18-9d13-e5a173d1c3a8	955efa64-eee8-4d6b-9e6f-5934ce9ba475	king jimenez	Gato	Mestizo	3	Macho	4.00	gris	2022-01-29	f	no	el rey de la casa	\N	t	2025-08-14 13:03:36.63787	2025-08-14 19:28:21.915803	\N
53357b79-03e6-48df-b1d8-ab3d2bbd769b	7ca0ff53-1693-49db-ba11-0515e6a5fe15	pantera	Pez	Otro	\N	Macho	\N	negro	\N	f	\N	Bagre, tigrillo	\N	t	2025-08-12 12:52:36.082658	2025-09-01 19:07:25.263831	\N
ca240981-2fa8-43ca-8160-bc82e003d0d9	a3cf6a46-197b-4b36-9598-00d54c022113	Rex	Perro	\N	\N	Macho	\N	\N	\N	f	\N	\N	\N	t	2025-08-01 20:37:44.374966	2025-09-01 20:33:14.263685	\N
24e8a50c-912d-4749-bf85-4d01adb8ef46	bb56cbdd-f2a9-43ab-ad46-b72880579e5d	Firulais	Perro	\N	\N	Macho	\N	\N	\N	f	\N	\N	\N	t	2025-08-01 20:34:48.86339	2025-08-01 20:34:48.86339	\N
c8ece1d9-d7db-4f38-b88a-ec9673c2f70d	21176cd5-7e32-4c15-815b-b8917617f778	candela	Otro	Otro	0	Hembra	\N	negro - rojo	2025-06-01	f	\N	hormiga	/uploads/pacientes/mascota-c8ece1d9-d7db-4f38-b88a-ec9673c2f70d-1755215795041.jpeg	t	2025-08-01 20:54:44.690708	2025-08-14 18:56:35.046761	\N
17983ad0-c6ea-40c4-93f3-32cf18cda6e2	e8504adb-a6c1-4497-87de-b40acbfcc608	Garfield	Gato	Maine Coon	1	Macho	1.50	amarillo	2024-06-10	f	\N	\N	\N	t	2025-08-01 20:35:10.393366	2025-08-12 12:50:33.084215	\N
a1556b25-32b1-4040-9bcc-65a3fe7e82c6	21176cd5-7e32-4c15-815b-b8917617f778	shiny	Ave	Cacatúa	0	Hembra	0.20	blanco amarillo	2025-04-07	f	\N	\N	\N	t	2025-08-12 12:51:39.377555	2025-08-12 12:51:39.377555	\N
57832cc9-0546-4f62-93c6-35f2da88543a	df6a46d1-cc0d-4ae5-a4a4-a6b4eea50b4c	Bella Baby	Gato	Siamés	0	Hembra	1.20	Crema	2025-04-30	f		\N	\N	t	2025-07-22 20:14:02.416229	2025-08-12 12:55:39.2851	\N
fdab6850-337a-4b01-910c-1424e4bd9e0c	21176cd5-7e32-4c15-815b-b8917617f778	bombom	Perro	Mestizo	1	Hembra	12.00	dorado	2024-08-01	f	\N	la bironcha	/uploads/pacientes/mascota-fdab6850-337a-4b01-910c-1424e4bd9e0c-1755217230890.jpeg	t	2025-07-26 18:31:42.285952	2025-08-14 19:20:30.894333	\N
b9be9992-6c5d-488d-8994-c2d461b13c9d	21176cd5-7e32-4c15-815b-b8917617f778	candela	Otro	Otro	0	Hembra	\N	negro - rojo	2025-06-01	f	\N	Hormiga	/uploads/pacientes/mascota-b9be9992-6c5d-488d-8994-c2d461b13c9d-1755217407824.jpeg	t	2025-08-01 20:57:01.908371	2025-08-14 19:23:27.83342	\N
\.


--
-- Data for Name: vacunas_tratamientos; Type: TABLE DATA; Schema: clinical; Owner: -
--

COPY clinical.vacunas_tratamientos (id_vacuna, id_mascota, tipo, nombre, fecha_aplicacion, proxima_dosis, lote, veterinario, notas, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: cajas; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.cajas (id_caja, nombre, tipo, descripcion, saldo_inicial, saldo_actual, activa, created_at, updated_at, created_by) FROM stdin;
3b17041f-c58d-4a1a-b513-fd7d720cb668	Caja Principal	Caja Menor	Caja principal de la clínica	0.00	0.00	t	2025-07-21 12:58:52.381881	2025-07-21 12:58:52.381881	18e50a42-4833-4603-8b1d-98ecbbf353cc
3b107bf2-0077-4bfb-bfa2-072500fb5247	Caja Menor	Caja Menor	Caja para gastos menores y efectivo	0.00	0.00	t	2025-07-20 21:53:49.956621	2025-09-13 20:54:23.544874	\N
44060d7b-c025-40fa-937b-3176c767f814	Cuenta Bancaria Principal	Cuenta Bancaria	Cuenta bancaria principal de la clínica	0.00	35700.00	t	2025-07-20 21:53:49.956621	2025-09-14 16:17:22.133405	\N
2c106173-1a9b-4b71-a87e-b930ac866116	Caja Fuerte	Caja Fuerte	Caja fuerte para valores importantes	0.00	6000.00	t	2025-07-20 21:53:49.956621	2025-09-14 16:32:16.233483	\N
\.


--
-- Data for Name: categorias_egresos; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.categorias_egresos (id_categoria, codigo, nombre, descripcion, activa, created_at) FROM stdin;
501a8250-bbd3-492d-8bd5-8bc11d9eb971	EGR01	Nómina y Personal	Gastos relacionados con el personal	t	2025-07-23 13:07:41.072392
0fa7775c-8c4f-4f36-871a-9f89cce73291	EGR02	Compra de Inventario	Compras a proveedores de medicamentos y productos	t	2025-07-23 13:07:41.072392
9eb50d01-1834-4483-81ba-9658a55903fb	EGR03	Gastos Operativos	Servicios públicos, mantenimiento, seguros	t	2025-07-23 13:07:41.072392
3c10b444-3993-402e-bd4f-97a4ee305612	EGR04	Marketing y Publicidad	Gastos en promoción y publicidad	t	2025-07-23 13:07:41.072392
052b5944-82f9-475e-9f80-0383c4dcd40b	EGR05	Gastos Administrativos	Papelería, software, licencias	t	2025-07-23 13:07:41.072392
d35b404b-ff5b-44af-bebf-5bec46992568	EGR06	Otros Gastos	Gastos diversos no clasificados	t	2025-07-23 13:07:41.072392
\.


--
-- Data for Name: categorias_ingresos; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.categorias_ingresos (id_categoria, codigo, nombre, descripcion, activa, created_at) FROM stdin;
6d39fc1f-012e-456d-83a3-85961506324d	ING01	Servicios Veterinarios	Ingresos por consultas y servicios médicos	t	2025-07-23 13:07:41.061467
6e09410d-c124-4170-ac95-cfc60583d445	ING02	Venta de Productos	Ingresos por venta de medicamentos y productos	t	2025-07-23 13:07:41.061467
8395e2a0-bc2c-4349-b788-f03f1ee8c21f	ING03	Terapias y Tratamientos	Ingresos por sesiones de terapia y tratamientos especiales	t	2025-07-23 13:07:41.061467
2df06d9a-1be5-46bb-8180-21f5520c990f	ING04	Otros Ingresos	Ingresos diversos no clasificados en otras categorías	t	2025-07-23 13:07:41.061467
\.


--
-- Data for Name: conceptos_egresos; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.conceptos_egresos (id_concepto, id_categoria, codigo, nombre, descripcion, activo, created_at) FROM stdin;
120bd48c-95ef-428a-b0c9-7df31bb98cab	501a8250-bbd3-492d-8bd5-8bc11d9eb971	EGR01-001	Salarios Base	Salarios base del personal	t	2025-07-23 13:07:41.07295
15cf8ee4-d8de-421a-ad66-9097f8d968c1	501a8250-bbd3-492d-8bd5-8bc11d9eb971	EGR01-002	Bonificaciones	Bonificaciones y primas	t	2025-07-23 13:07:41.07295
c2467344-0e5d-4048-89fc-5a285427f20c	501a8250-bbd3-492d-8bd5-8bc11d9eb971	EGR01-003	Seguridad Social	Aportes a seguridad social	t	2025-07-23 13:07:41.07295
05db49a2-af65-449f-af5e-33422dbd63b0	501a8250-bbd3-492d-8bd5-8bc11d9eb971	EGR01-004	Cesantías	Aportes a cesantías	t	2025-07-23 13:07:41.07295
1eaffe4e-572b-4072-81bc-70c76e33252c	501a8250-bbd3-492d-8bd5-8bc11d9eb971	EGR01-005	Horas Extra	Pago de horas extra	t	2025-07-23 13:07:41.07295
c406b2f0-ff51-4269-8f03-aa220c697114	501a8250-bbd3-492d-8bd5-8bc11d9eb971	EGR01-006	Vacaciones	Pago de vacaciones	t	2025-07-23 13:07:41.07295
a6ac981d-49f3-4447-97e9-5bcb5e3268c5	0fa7775c-8c4f-4f36-871a-9f89cce73291	EGR02-001	Medicamentos	Compra de medicamentos veterinarios	t	2025-07-23 13:07:41.073893
b6aa2a5d-2612-4072-b4de-081b9d0b8242	0fa7775c-8c4f-4f36-871a-9f89cce73291	EGR02-002	Vacunas	Compra de vacunas	t	2025-07-23 13:07:41.073893
831832aa-176f-4c0c-95ae-fdfe5052396a	0fa7775c-8c4f-4f36-871a-9f89cce73291	EGR02-003	Material Quirúrgico	Instrumental y material quirúrgico	t	2025-07-23 13:07:41.073893
c3b93269-f1ba-485b-87a5-deac43d06492	0fa7775c-8c4f-4f36-871a-9f89cce73291	EGR02-004	Alimentos Medicados	Compra de alimentos terapéuticos	t	2025-07-23 13:07:41.073893
cffb2af1-d1d3-4ecf-8e97-33bdb52a6862	0fa7775c-8c4f-4f36-871a-9f89cce73291	EGR02-005	Productos de Limpieza	Desinfectantes y productos de aseo	t	2025-07-23 13:07:41.073893
d6d14345-2407-4deb-b876-8f0bbd0fc217	9eb50d01-1834-4483-81ba-9658a55903fb	EGR03-001	Servicios Públicos	Electricidad, agua, gas, internet	t	2025-07-23 13:07:41.074252
023acab9-3d18-49c0-9c81-a1a20881ea30	9eb50d01-1834-4483-81ba-9658a55903fb	EGR03-002	Arriendo	Arriendo del local	t	2025-07-23 13:07:41.074252
f2d7af21-76cc-42f7-b7a8-bdfce11a6105	9eb50d01-1834-4483-81ba-9658a55903fb	EGR03-003	Mantenimiento Equipos	Mantenimiento de equipos médicos	t	2025-07-23 13:07:41.074252
fc4926f4-4dfd-4f2d-a6da-cc38d0b4fbf2	9eb50d01-1834-4483-81ba-9658a55903fb	EGR03-004	Seguros	Seguros del local y equipos	t	2025-07-23 13:07:41.074252
82c300de-9cb2-480c-bb3c-686665b833fd	9eb50d01-1834-4483-81ba-9658a55903fb	EGR03-005	Combustible	Combustible para vehículos	t	2025-07-23 13:07:41.074252
8f84669a-0d5a-4bb9-b449-e505a69aaade	9eb50d01-1834-4483-81ba-9658a55903fb	EGR03-006	Telecomunicaciones	Teléfono, internet, celulares	t	2025-07-23 13:07:41.074252
\.


--
-- Data for Name: conceptos_ingresos; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.conceptos_ingresos (id_concepto, id_categoria, codigo, nombre, descripcion, activo, created_at) FROM stdin;
5b43f7cb-37f0-44df-a229-62714449e85d	6d39fc1f-012e-456d-83a3-85961506324d	ING01-001	Consulta General	Consulta veterinaria general	t	2025-07-23 13:07:41.068239
03ed2b30-d412-4773-9084-3ec62ab60b8d	6d39fc1f-012e-456d-83a3-85961506324d	ING01-002	Consulta Especializada	Consulta con veterinario especialista	t	2025-07-23 13:07:41.068239
c7870ccd-9f0f-43d6-8468-e06a069ce782	6d39fc1f-012e-456d-83a3-85961506324d	ING01-003	Cirugías	Procedimientos quirúrgicos	t	2025-07-23 13:07:41.068239
2c468392-c06e-47d7-a62a-5ae6d21933c4	6d39fc1f-012e-456d-83a3-85961506324d	ING01-004	Vacunación	Aplicación de vacunas	t	2025-07-23 13:07:41.068239
199ece51-a4a7-4a59-8c6d-ed53d6690e92	6d39fc1f-012e-456d-83a3-85961506324d	ING01-005	Desparasitación	Tratamientos antiparasitarios	t	2025-07-23 13:07:41.068239
26b011dd-a7c6-45e4-991d-f278b0bcffdc	6d39fc1f-012e-456d-83a3-85961506324d	ING01-006	Exámenes Diagnósticos	Rayos X, ecografías, análisis	t	2025-07-23 13:07:41.068239
07bd1e43-4699-4a9c-a0eb-bfb37eda1335	6e09410d-c124-4170-ac95-cfc60583d445	ING02-001	Medicamentos	Venta de medicamentos veterinarios	t	2025-07-23 13:07:41.071727
960630ca-832e-4966-9907-80506835843a	6e09410d-c124-4170-ac95-cfc60583d445	ING02-002	Alimentos Medicados	Venta de alimentos terapéuticos	t	2025-07-23 13:07:41.071727
83d8c3ea-0916-4b20-9356-89c58fed4555	6e09410d-c124-4170-ac95-cfc60583d445	ING02-003	Accesorios	Venta de collares, correas, juguetes	t	2025-07-23 13:07:41.071727
b7de2b49-631f-4d92-887f-98d71edd02c1	6e09410d-c124-4170-ac95-cfc60583d445	ING02-004	Productos de Higiene	Shampoos, cepillos, productos de limpieza	t	2025-07-23 13:07:41.071727
f87fd381-1d21-476b-9883-ad2efc5b1415	8395e2a0-bc2c-4349-b788-f03f1ee8c21f	ING03-001	Terapia Individual	Sesión individual de terapia	t	2025-07-23 13:07:41.072097
872a7709-e4f7-4c37-9533-7aaf67e0edc4	8395e2a0-bc2c-4349-b788-f03f1ee8c21f	ING03-002	Paquete 5 Sesiones	Paquete de 5 sesiones de terapia	t	2025-07-23 13:07:41.072097
2ad90bc8-00e2-455e-a66b-11786079b46a	8395e2a0-bc2c-4349-b788-f03f1ee8c21f	ING03-003	Paquete 10 Sesiones	Paquete de 10 sesiones de terapia	t	2025-07-23 13:07:41.072097
4b982b1a-397d-40f5-a33d-0a574226bf15	8395e2a0-bc2c-4349-b788-f03f1ee8c21f	ING03-004	Rehabilitación	Terapias de rehabilitación post-operatoria	t	2025-07-23 13:07:41.072097
\.


--
-- Data for Name: control_terapias; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.control_terapias (id_control, id_mascota, id_factura, id_producto, tipo, sesiones_total, sesiones_usadas, fecha_inicio, fecha_ultima_sesion, fecha_vencimiento, activo, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: egresos; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.egresos (id_egreso, codigo_egreso, id_caja, descripcion, monto, categoria, fecha, referencia, metodo_pago, id_orden_compra, notas, created_at, created_by, id_concepto_egreso, categoria_legacy, observaciones) FROM stdin;
\.


--
-- Data for Name: facturas_venta; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.facturas_venta (id_factura, codigo_factura, id_cliente, fecha, subtotal, impuestos, descuento, total, metodo_pago, estado, id_caja, notas, created_at, created_by, whatsapp_enviado, fecha_envio_whatsapp, telefono_envio, id_consulta) FROM stdin;
bf9fa7b0-021c-49b4-acc8-6758037cead3	FAC-17578855	46b889c7-d434-4653-94aa-8afe597b2a9e	2025-09-12 16:32:16.233483	6000.00	0.00	0.00	6000.00	Efectivo	Pagada	2c106173-1a9b-4b71-a87e-b930ac866116	Factura de prueba automática	2025-09-14 16:32:16.233483	\N	f	\N	\N	76c12acf-e5a2-45b6-b399-6a49dbfdcab8
bd1009fa-f34d-4990-89c8-a6bbc24c090c	FAC-17578840	21176cd5-7e32-4c15-815b-b8917617f778	2025-09-14 05:00:00	30000.00	0.00	0.00	30000.00	Efectivo	Pagada	44060d7b-c025-40fa-937b-3176c767f814	Factura para cita: 739d0798-df60-492c-b99e-4e4a0942a1bf - Paciente: bombom	2025-09-14 16:07:58.431661	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	f	\N	\N	\N
\.


--
-- Data for Name: ingresos; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.ingresos (id_ingreso, codigo_ingreso, id_caja, descripcion, monto, categoria, fecha, referencia, metodo_pago, notas, created_at, created_by, id_concepto_ingreso, categoria_legacy, observaciones) FROM stdin;
98ce798c-4820-4573-80f5-46e65974e146	ING-1757884078736	44060d7b-c025-40fa-937b-3176c767f814	Pago de factura FAC-17578840	35700.00	venta	2025-09-14 00:00:00	FAC-17578840	Efectivo	\N	2025-09-14 16:07:58.431661	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N
a89cd606-1660-4022-a4f7-0e6aca20dbe5	ING-1757885536264	2c106173-1a9b-4b71-a87e-b930ac866116	Pago de factura FAC-17578855	6000.00	venta	2025-09-14 00:00:00	FAC-17578855	Efectivo	\N	2025-09-14 16:32:16.233483	\N	\N	\N	\N
\.


--
-- Data for Name: lineas_factura; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.lineas_factura (id_linea, id_factura, id_producto, cantidad, precio_unitario, descuento) FROM stdin;
3729ca75-1f1d-47c9-b0f8-3434618718f2	bf9fa7b0-021c-49b4-acc8-6758037cead3	aecfd408-6599-46b2-b220-26dda29b0d2d	2	3000.00	0.00
5f6be2f8-2487-4278-94b7-06eea5f30e4f	bd1009fa-f34d-4990-89c8-a6bbc24c090c	aecfd408-6599-46b2-b220-26dda29b0d2d	10	3000.00	0.00
\.


--
-- Data for Name: lineas_orden_compra; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.lineas_orden_compra (id_linea, id_orden, id_producto, cantidad, precio_unitario) FROM stdin;
113abd63-6db4-4c93-83b9-275d9a067ceb	a2dedb42-109f-4e2d-a232-f100bad91a8f	22d121b3-af74-49b2-8a03-9511d106342b	5	40000.00
41fb9512-4383-4193-baa9-2d1e52fdbdd2	a2dedb42-109f-4e2d-a232-f100bad91a8f	79002bec-0170-4576-9333-9b0727015203	5	25000.00
\.


--
-- Data for Name: ordenes_compra; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.ordenes_compra (id_orden, codigo_orden, id_proveedor, fecha, total, tipo_pago, fecha_vencimiento, estado, notas, created_at, updated_at, created_by) FROM stdin;
a2dedb42-109f-4e2d-a232-f100bad91a8f	OC-20250724-904571	96d2523c-f35a-43a8-bc99-b88f1b3c9e19	2025-07-23 21:41:44.571574	325000.00	Crédito	2025-08-23	Pendiente	Test purchase order created by automated test	2025-07-23 21:41:44.571574	2025-07-23 21:41:44.571574	612b7d82-bf59-489a-8e1b-97c7dad91717
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.productos (id_producto, codigo, nombre, descripcion, tipo, categoria, marca, precio_compra, precio_venta, stock_actual, stock_minimo, inventariable, activo, sesiones_incluidas, duracion_sesion, created_at, updated_at, created_by, codigo_barras, subcategoria, stock_maximo, unidad_medida, lote, fecha_vencimiento, ubicacion, requiere_receta, iva_aplicable) FROM stdin;
aecfd408-6599-46b2-b220-26dda29b0d2d	MED-001	Amoxicilina 500mg	Antibiótico para perros y gatos	Producto	Medicamentos	VetPharm	2500.00	3000.00	-1	10	t	t	\N	\N	2025-07-20 21:53:49.956621	2025-09-14 19:06:46.518593	\N	7501234567891		0	unidad	lot003	2025-09-30	cajon Medicamentos	f	0.00
feda5e84-04c8-4010-a71b-bd0a4a992b31	THER-001	Sesión de Fisioterapia	Sesión individual de fisioterapia	Terapia Individual	Terapias	\N	\N	50000.00	0	0	f	t	1	60	2025-07-20 21:53:49.956621	2025-09-13 18:41:47.864474	\N	7501234567894	\N	\N	unidad	\N	\N	\N	f	0.00
22d121b3-af74-49b2-8a03-9511d106342b	CONS-002	Consulta de Control	Consulta de control post-tratamiento	Servicio	Consultas	\N	\N	40000.00	0	0	f	t	\N	20	2025-07-20 21:53:49.956621	2025-09-13 18:41:47.864474	\N	\N	\N	\N	unidad	\N	\N	\N	f	0.00
3ee6bf18-cde0-4f81-93ac-7e16fb4d4a5f	VAC-001	Vacuna Triple Felina	Vacuna contra rinotraqueitis, calicivirus y panleucopenia	Producto	Vacunas	\N	\N	45000.00	23	0	t	t	\N	\N	2025-07-20 22:41:37.644055	2025-09-13 18:41:47.864474	18e50a42-4833-4603-8b1d-98ecbbf353cc	7501234567892	\N	\N	unidad	\N	\N	\N	f	0.00
a113fced-b6ab-419c-974c-2ac625c29506	THER-PKG-001	Paquete 10 Fisioterapias	Paquete de 10 sesiones de fisioterapia con descuento	Terapia Paquete	Terapias	\N	\N	450000.00	0	0	f	t	10	60	2025-07-20 21:53:49.956621	2025-09-13 18:41:47.864474	\N	7501234567895	\N	\N	unidad	\N	\N	\N	f	0.00
a5352a43-085e-4ead-9753-e0b811a1afff	ACC-001	Collar Isabelino Mediano	Collar de recuperación	Producto	Accesorios	PetCare	8000.00	15000.00	0	3	t	f	\N	\N	2025-07-20 21:53:49.956621	2025-09-13 18:41:47.864474	\N	\N	\N	\N	unidad	\N	\N	\N	f	0.00
b893941b-b603-4c64-989b-ca0085d75a08	MED-105	Ketamina 10 mg/ml	Anestésico inyectable	Producto	Medicamentos	Genérico	\N	25000.00	10	2	t	t	\N	\N	2025-09-13 18:16:13.337197	2025-09-13 18:41:47.864474	\N	\N	\N	\N	unidad	\N	\N	\N	f	0.00
bfc97632-243c-430e-8e27-5dceb022d02d	ALI-001	Alimento Premium Perro Adulto	Alimento balanceado para perros adultos - 15kg	Producto	Alimentos	Gosby	100000.00	120000.00	30	10	t	t	\N	\N	2025-07-20 22:41:37.649011	2025-09-13 18:41:47.864474	18e50a42-4833-4603-8b1d-98ecbbf353cc	7501234567896		0	kg		\N		f	0.00
c6472a7c-d0d9-4abf-a9d3-e1d5e221fe5a	MED-103	Pirantel Pamoato 150 mg	Antiparasitario interno	Producto	Medicamentos	Genérico	\N	12500.00	80	10	t	t	\N	\N	2025-09-13 18:16:13.337197	2025-09-13 18:41:47.864474	\N	\N	\N	\N	unidad	\N	\N	\N	f	0.00
c96764f5-1934-411c-bc1c-3587348e482d	MED-104	Fipronil 10% Spot-On	Antiparasitario externo tópico	Producto	Medicamentos	Genérico	\N	15000.00	40	5	t	t	\N	\N	2025-09-13 18:16:13.337197	2025-09-13 18:41:47.864474	\N	\N	\N	\N	unidad	\N	\N	\N	f	0.00
cdd7c4e0-3a05-4f76-837a-c52cf67d012e	CONS-001	Consulta General	Consulta veterinaria general	Servicio	Consultas	\N	\N	80000.00	0	0	f	t	\N	30	2025-07-20 21:53:49.956621	2025-09-13 18:41:47.864474	\N	7501234567893	\N	\N	unidad	\N	\N	\N	f	0.00
d03ab85a-2d89-4558-9e95-0bca0bcbc8d2	MED-102	Carprofeno 50 mg	Analgésico y antiinflamatorio	Producto	Medicamentos	Genérico	\N	12000.00	30	5	t	t	\N	\N	2025-09-13 18:16:13.337197	2025-09-13 18:41:47.864474	\N	\N	\N	\N	unidad	\N	\N	\N	f	0.00
f4a0a3a9-25e3-4064-8bf3-e95f8406db03	FOOD-001	Alimento Terapéutico Renal	Alimento especializado para problemas renales	Producto	Alimentos	VetDiet	45000.00	75000.00	0	2	t	t	\N	\N	2025-07-20 21:53:49.956621	2025-09-13 18:41:47.864474	\N	\N	\N	\N	unidad	\N	\N	\N	f	0.00
79002bec-0170-4576-9333-9b0727015203	MED-002	Vitaminas B-Complex	Complejo vitamínico para mascotas	Producto	Vitaminas	NutriPet	15000.00	25000.00	3	5	t	t	\N	\N	2025-07-20 21:53:49.956621	2025-09-13 21:34:31.221678	\N	\N	\N	\N	unidad	\N	\N	\N	f	0.00
df1796f6-5219-4e64-8fe2-112124ce6adb	MED-101	Amoxicilina 250 mg	Antibiótico oral en cápsulas	Producto	Medicamentos	Genérico	5000.00	8500.00	20	5	t	t	\N	\N	2025-09-13 18:16:13.337197	2025-09-13 21:52:35.40428	\N	\N		0	unidad	lot-003	2025-10-30	bodega	t	0.00
\.


--
-- Data for Name: proveedores; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.proveedores (id_proveedor, nombre, nit, telefono, email, direccion, contacto_principal, terminos_pago, activo, created_at, updated_at, created_by) FROM stdin;
96d2523c-f35a-43a8-bc99-b88f1b3c9e19	Distribuidora Veterinaria Global	900123456-1	+57 301 234 5678	ventas@vetglobal.com	Calle 123 #45-67, Bogotá	Juan Pérez	30	t	2025-07-20 21:53:49.956621	2025-07-20 21:53:49.956621	\N
8503ed21-ef0e-4552-aa02-9cd8e622a773	Laboratorios VetMed	800987654-2	301-555-9876	contacto@vetmed.com	Carrera 15 #30-50, Medellín	Ana García	45	t	2025-07-23 21:35:31.58586	2025-07-23 21:35:31.58586	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c
967a0d9d-421c-42ba-ba22-1d0fcc57d5a0	Proveedor Audit Test	12345678-9	555-0000	audit@proveedor.com	Direccion Test	Contacto Test	30	t	2025-07-23 22:10:21.071201	2025-07-23 22:10:21.071201	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c
\.


--
-- Data for Name: sesiones_terapia; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.sesiones_terapia (id_sesion, id_control, fecha_sesion, observaciones, duracion_real, realizada_por, created_at) FROM stdin;
\.


--
-- Data for Name: transferencias_cajas; Type: TABLE DATA; Schema: financial; Owner: -
--

COPY financial.transferencias_cajas (id_transferencia, codigo_transferencia, id_caja_origen, id_caja_destino, monto, descripcion, fecha, metodo_pago, estado, notas, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: blacklisted_tokens; Type: TABLE DATA; Schema: vetplus_auth; Owner: -
--

COPY vetplus_auth.blacklisted_tokens (id_token, token, id_usuario, razon, created_at) FROM stdin;
0b88c53a-2064-4e0b-b52a-71dd15d43d4d	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTYyNTc5NzUsImV4cCI6MTc1NjM0NDM3NSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.CJC_GxUTeUR-c_nOh7STuUznXqaiQenk_rTnTLkZXI8	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-08-26 20:26:26.634506
1039aaa2-7a19-4b91-bccc-ed183c62c21e	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTYyNTc5OTksImV4cCI6MTc1NjM0NDM5OSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.geVXJ2L27Pt0rKj6LjlGyv5p-uNWI7LE2s2tc20ywws	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-08-27 19:57:27.251831
ac7a7629-3947-4ba0-95eb-7495286deb37	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjNmE5ZTMwLTA3OTYtNDdkOC05MDRkLWVmMmYxZWFhMGIyMCIsImVtYWlsIjoibWFyaWFmQGNvcnJlby5jb20iLCJyb2wiOiJ2ZXQiLCJub21icmUiOiJtYXJpYSBmZXJuYW5kYSIsImlhdCI6MTc1NjM0MjY1NywiZXhwIjoxNzU2NDI5MDU3LCJhdWQiOiJ2ZXRwbHVzLXVzZXJzIiwiaXNzIjoiVmV0UGx1cyJ9.1XBZU8iWEKWXxPxEB__RKz8ofm7Z4lQkJaxaDeFAN2U	fc6a9e30-0796-47d8-904d-ef2f1eaa0b20	logout	2025-08-27 19:58:21.254885
d4ba5283-b608-4f17-bcb4-2254d95201dd	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTY3NzA2NDAsImV4cCI6MTc1Njg1NzA0MCwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.oIzhKPr3EzKovbUpCbjhcmpqiwhw6Q0Oa2z91L3wuDQ	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-09-01 19:58:36.691914
b897d911-1352-4e45-95cb-0f999fbfd0d9	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTY3NzY2MTYsImV4cCI6MTc1Njg2MzAxNiwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.Fi9iR1RBTVRdcOmkJ_fJ_2FvVVdoPYV5eHd3LIEqYxo	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-09-01 20:31:29.276494
97a3b376-2821-4af7-9334-c3a71b48b191	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTY3NzY3MjcsImV4cCI6MTc1Njg2MzEyNywiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.2PuY2gmdZRQxG4Sxcn508oCwDuFccwpww1gKhujm78A	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-09-01 20:49:31.951598
20f99ce9-8454-4ffb-b7ad-c23be361606e	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjNmE5ZTMwLTA3OTYtNDdkOC05MDRkLWVmMmYxZWFhMGIyMCIsImVtYWlsIjoibWFyaWFmQGNvcnJlby5jb20iLCJyb2wiOiJ2ZXQiLCJub21icmUiOiJtYXJpYSBmZXJuYW5kYSIsImlhdCI6MTc1Njc3Nzc3NywiZXhwIjoxNzU2ODY0MTc3LCJhdWQiOiJ2ZXRwbHVzLXVzZXJzIiwiaXNzIjoiVmV0UGx1cyJ9.mNxmRF4k66MKR-sZ39VBNOuPvpxL_9Vycz-_QvUp6fs	fc6a9e30-0796-47d8-904d-ef2f1eaa0b20	logout	2025-09-01 20:50:10.07747
30ec7314-eac5-4688-9846-9946b3683617	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc3NzAxODksImV4cCI6MTc1Nzg1NjU4OSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.cx3MsRyYY43aBr6USBF2-8VZoZhrLYAN02lOhHnrPU4	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-09-13 11:27:41.307519
17fbe3f1-8d77-4415-92cf-aa9d5956d721	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjMxZjU2NTk0LTAzZGEtNGIxMS1iYTAzLTBjMGY2NjA5ZTExMSIsImVtYWlsIjoiZGllZ29AY29ycmVvLmNvbSIsInJvbCI6ImF1eF9hZG1pbiIsIm5vbWJyZSI6ImRpZWdvIiwiaWF0IjoxNzU3NzgwODY3LCJleHAiOjE3NTc4NjcyNjcsImF1ZCI6InZldHBsdXMtdXNlcnMiLCJpc3MiOiJWZXRQbHVzIn0.XoJREBDmrea7wAys3Rfr05Svnk-jaanbj286vVvNs1o	31f56594-03da-4b11-ba03-0c0f6609e111	logout	2025-09-13 11:28:31.72244
fe69aaf7-fb18-4af7-b451-5a462931e0be	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjNmE5ZTMwLTA3OTYtNDdkOC05MDRkLWVmMmYxZWFhMGIyMCIsImVtYWlsIjoibWFyaWFmQGNvcnJlby5jb20iLCJyb2wiOiJ2ZXQiLCJub21icmUiOiJtYXJpYSBmZXJuYW5kYSIsImlhdCI6MTc1Nzc4MDkxOSwiZXhwIjoxNzU3ODY3MzE5LCJhdWQiOiJ2ZXRwbHVzLXVzZXJzIiwiaXNzIjoiVmV0UGx1cyJ9.4MS9SD-lAKh8MKzhAN5bgyjA7qR30Sv0fj6Xrc7SuZ4	fc6a9e30-0796-47d8-904d-ef2f1eaa0b20	logout	2025-09-13 11:29:13.209992
69628fc3-af63-4778-919f-ddf00752612c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc3ODA5NTgsImV4cCI6MTc1Nzg2NzM1OCwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ._D2AUjE8FgJe5zzFT15t0A_VjAbi1veXzGaHDaFkcmE	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-09-13 11:45:57.178404
c80c4d3e-f41a-4fdd-995e-5859ce710540	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc3OTg5MTQsImV4cCI6MTc1Nzg4NTMxNCwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.AJVGI8wUvNZomwYG_Ic17htiWSpF2VU0nqcrrGfq8xk	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-09-13 16:35:07.927065
29528a25-7a9e-4160-b76d-a5d001078524	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc3OTk0NDUsImV4cCI6MTc1Nzg4NTg0NSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.9KT2q04kH2ZOtfU2ToG3NOeJFQyHiY-2GL9QJmKiTxo	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-09-13 16:40:57.91513
ef66bd45-a3c1-49b9-96ac-44bb280e7544	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc3OTk2OTQsImV4cCI6MTc1Nzg4NjA5NCwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.glqLwOBIN-IS1BoYF9eWg8e3WWqElx2VaVBDmP_hbFQ	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-09-13 17:24:53.532597
06e36b87-4199-4de7-aa7a-df6fd12b081b	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc4MDIzMDEsImV4cCI6MTc1Nzg4ODcwMSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.Dr05hkIPRCLAw8R8ORGPVbksJFu2JqvCzkKr_qKxWOY	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-09-13 20:31:05.111912
0a1dd5ce-1020-4b2c-9992-09e21ed9c024	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc4MTM0NjksImV4cCI6MTc1Nzg5OTg2OSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.uaqmzQfA1_wk4G-QtStdoUFUaxnQinaMBfTlajbylTQ	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-09-14 09:10:41.096606
d0084451-781a-48dd-a8de-bf76459f7936	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc4NTkwNTEsImV4cCI6MTc1Nzk0NTQ1MSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.lLccYiTIgaeR39ApkYuGG7OkiuCewQa6EpSofVLOmAM	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-09-14 10:19:06.209367
22090c38-5b4c-41d3-9c92-d0c8b9c2287b	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc4NjMxNzksImV4cCI6MTc1Nzk0OTU3OSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.Z9a3ZWsqsQx8_9n-YGVHhS5CTQOXu7EaMEPtPGrqve8	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-09-14 18:09:12.003586
20704842-bd9e-42fc-a0f3-055752b26a7d	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc4OTEzNTYsImV4cCI6MTc1Nzk3Nzc1NiwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.6QU13493w8d8E170yj1Q9MEuFlg5Xux3tHZDuM1t-6k	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	logout	2025-09-14 18:51:59.738565
\.


--
-- Data for Name: google_calendar_config; Type: TABLE DATA; Schema: vetplus_auth; Owner: -
--

COPY vetplus_auth.google_calendar_config (id_config, client_id, client_secret, redirect_uri, refresh_token, access_token, token_expiry, calendar_id, timezone, notification_email, notification_popup, default_reminder_minutes, email_reminder_hours, is_active, configured_by, webhook_channel_id, webhook_url, webhook_expiration, webhook_resource_id, created_at, updated_at) FROM stdin;
c294327d-912d-4c21-bb7a-7e862e71b326	54253011928-2lqgnjv6c3u66vrmaquj0ng6g28uhrne.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	\N	\N	\N	primary	America/Bogota	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-07-27 20:35:42.973021-05	2025-08-01 08:14:28.043122-05
95a94a46-3bca-45db-8ade-a3ec858eb192	54253011928-2lqgnjv6c3u66vrmaquj0ng6g28uhrne.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	\N	\N	\N	primary	America/Bogota	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-07-31 18:57:05.157324-05	2025-08-01 08:14:28.043122-05
c63ecaf5-8ba8-4e68-bdbd-2b1f7dab1172	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01227xPyK1scJCgYIARAAGAESNwF-L9Ir-cV-YSe3vPMx8Tis3iNvrX7mtszTEYnjNll8VYili624mJoKiamZeZDgDPKdrwT6GxI	ya29.a0AS3H6NyVHVYrG2Ka-LwNVPL6KhF1jolzMaO4fnhjohsT9sEZVvN3QhBQXWxQF3XNba0Wez0_jfibcmwJQMi_E1xCZ85oAnrhNZw67xTMu6J80VgNeDqry6IlQEAT0WOL396WexJBVsr9lt7kK7SbfpVXRNCYh_4c1c00diIPaCgYKAVsSARQSFQHGX2Mivs5r8XhwRrnJ4opYcwVkuw0175	2025-08-01 08:20:46.08-05	primary	America/Bogota	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-07-31 21:04:31.129965-05	2025-08-01 08:14:28.043122-05
ab6e0433-1462-45e2-8c7f-7bb6ef383b67	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	\N	\N	\N	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 07:26:41.823896-05	2025-08-01 08:14:28.043122-05
fd2fbd8e-a2ee-4bbb-abcb-02b2ce6b4975	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01HxX-U8O3kOTCgYIARAAGAESNwF-L9IraqHo4J47oaUHT6exFwKkfXCWtOeZW7V7siHFlcfWnuTd1p7y3xF8l7En4BzsZvYu6bc	ya29.a0AS3H6Nz5KfqqSLmaI6tAgMITtd8BEnrrY81COYM7CsDN31SlPzvNbPcRDeX12nsUHoeKZ1b49IaJtQU_j_4GwVuZoc2uAHeZkw3a1a_wqLIFoBvHoX2VXY4nxiH8sd9_QDxJcCOU6u8bjCws_25f6pZxRkkkMqeUViT9JsCOaCgYKAUESARQSFQHGX2Mig-86OeGK0b1Hmc2Ivxb8_A0175	2025-08-01 09:01:27.963-05	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 08:01:21.597679-05	2025-08-01 08:14:28.043122-05
a5689a1a-60c8-4de8-a228-2b11c970baab	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	\N	\N	\N	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 08:01:11.099208-05	2025-08-01 08:14:28.043122-05
c17b5718-7007-4a93-8769-4253114d2a46	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01fqUwuYnroA0CgYIARAAGAESNwF-L9IrxdrLswnkYgkmav-2SFk4waAQshD7uzYMmM0CwpxKJhs69dAPjwZ0uVPiFQBPVlloz-I	ya29.a0AS3H6NxhCvaBzZdcAMxQFtFqCju6IHjAdM_CyJo_smFrU8Y6ITxdkFjWMNUGqgxjYPY0oQ8GOluSJl4VOtXykbogmzGv3p7Csa7bc_DRErBwzELoR5ARfEWw9r7rH817W7WMhghYXG51e0At8c1S_H7iVHmkR2Uhu60JM-YkaCgYKAYISARQSFQHGX2MiRBf0p4mCtnUj2bYgV0TeQw0175	2025-08-01 08:50:13.771-05	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 07:50:07.628864-05	2025-08-01 08:14:28.043122-05
55c023d1-21df-42f6-94dd-db3b0847fb72	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01gknw9CC41ziCgYIARAAGAESNwF-L9IrJheEj6SmlgjT1fAR22mQ5quyOYS8l38gyz1Hh8LZPOsAzB1mtKb2F4wPuUIbOuUJr5c	ya29.a0AS3H6Nxp3aqnfgMLLRIibvSy-HM2qv-WoCMOthEVbAxN4z4O8pLImPszcSS8RZb8VYsam_1aXnYA7SeFtcn3BSj1VmZn-uywXx0EaFxr-z7roaLzU41fnfGwWPvK_Mw4B_fIF5o3_b6KhnQNnyU2pi0KOId8RiuBCBBOtDktaCgYKAfISARQSFQHGX2MiR-3RIvcQXggE6TtssIIaeg0175	2025-08-01 09:00:39.945-05	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 08:00:32.199615-05	2025-08-01 08:14:28.043122-05
a7ca300a-1281-4490-b9ed-8f4802f72153	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	\N	\N	\N	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 08:01:17.660647-05	2025-08-01 08:14:28.043122-05
92595f3c-e1b4-494a-bb5f-0eee1602c15e	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	\N	\N	\N	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 08:14:23.175522-05	2025-08-01 08:14:28.043122-05
8b29a02a-77e5-4242-8d2c-bcb5c3a50da2	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01vsvX9t41cBZCgYIARAAGAESNwF-L9IrafQQLcnzKyiq6NETUYoZski4YBmAu9RHtf4wyu5wVhYNgS5ZgJewPk_vi4mLfamj9D4	ya29.a0AS3H6NwCuawQH_0tobR0NvRLlnY_5sGVksg6CRDWMVTQa0v9F2NBE5FwgCr-QNEj9-A71dAzIzGbEyA7_WI50ZJ1stZIVajNqDfrFmYxzfi_1sMVbxyLlqUvgCrO6zSigJwVR8ljEKEfcVJq3YuTX0JTCH5JnAdi5tb5l99DaCgYKAQMSARQSFQHGX2Mi8odp0652wGAG0ogxOZDaPA0175	2025-08-01 08:26:58.529-05	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 07:26:45.841298-05	2025-08-01 08:14:28.043122-05
e39f9011-a33e-4c4d-9998-c80b157c6a64	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01cp-4kVYkddWCgYIARAAGAESNwF-L9IrYnyo_05zVarL_wnV3JcRYyRJky3YXgl202YbH5aw-b2ChXIGr-p3jAqT0cAI0bcnScs	ya29.a0AS3H6NwtvjFWu9ea3_F9804AlKrwbDd8PqacMkP6zn3BA9C1xAkm0-eSPJtHRfnqTi7Zgzvp-kN1ZgGlv6rfNaYnhafvczZp0J_6KYrXZwl4poGbH8H4FhJKpzevtN17bjUUg8-jDPHe4JemH4-zzBoGQ362Qn2NEjXB7TCkaCgYKAW0SARQSFQHGX2MitJnvnrN5gzmqN_yNuuKVCg0175	2025-08-01 08:27:14.792-05	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 07:27:09.463812-05	2025-08-01 08:14:28.043122-05
70b901ed-4a24-4b9e-8982-1d26b7672892	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01cDZah9-egsfCgYIARAAGAESNwF-L9Ir91LvWpOf4I4_g5F9caga8zX9COA59WH_UrJV2OY9NpbVFqB4EMfJwj4LxTSx8IS7Coc	ya29.a0AS3H6NwZtkRwgrKav_NsgR4dVodVvKFt0IveKEp8-PlN0y9rZmXr7XFrLuZcUgOG-F8YSaPglgB6cUMeha8rZkISPZ49RwOC7Ngzzc9mBIvUYBhJSs7f7KvXP10rFD5dfPsKtZMC_Ic7muUKMpO3qubK8yjYirgKhzwwRWmTaCgYKAXISARQSFQHGX2MiCz7cQzYIHLm1tpivtJpUkw0175	2025-08-01 09:29:25.323-05	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 08:14:28.04478-05	2025-08-01 08:30:44.636296-05
7642357a-0cec-47df-8f71-e4db472b9fd5	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01DtPW5zrG28QCgYIARAAGAESNwF-L9IrGD3dP1dzTDUK4tcuYFbWX8EGncpl_CxaUCCFAUokmOn8QDg2Ls2we-oQN5ZoBUWHQJk	ya29.a0AS3H6NxSridd3JekikXsrvV1Gscuh_4z2OdPJtabMpL8er12WAr0EsWU8BbSt59Dw0hTvGG-wanrpQUS8UcZsnA0KVaaG88Cd2NkNVgY7NHBpD8VRzzKlLwrJMKBCDQ6Ma2J9H8WwFnliLr4ULqn4NPQTl5RRZY1dFJAZcluaCgYKAeoSARQSFQHGX2MisofYEewp28hbYwMn503mlQ0175	2025-08-01 08:28:52.645-05	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 07:28:36.977452-05	2025-08-01 08:14:28.043122-05
526730c9-71ce-4ed6-9b44-2a2661ebcc1e	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	\N	\N	\N	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 07:42:01.491606-05	2025-08-01 08:14:28.043122-05
051cb016-fdb6-47e4-9150-427786e4f9a9	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	\N	\N	\N	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 07:50:03.919083-05	2025-08-01 08:14:28.043122-05
8252313e-8088-4528-87f1-cc5145823952	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	\N	\N	\N	Primary	UTC	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 08:34:42.112387-05	2025-08-01 08:34:48.643832-05
be31be22-a677-446b-be56-a16e5f2f6dd6	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01hTXqI2uvfQhCgYIARAAGAESNwF-L9Irq4pMn01c6A03JbFRZ-1BP6D_ZFx_e5JHxznVDCiARushMJzQc5eFAdvGqs6RE_nTrbE	ya29.a0AS3H6NwAEI7UHs_d4MI92fnPb29CTH6DoHg1cQmsQdTbqowYdOx1XYuVKDmb6NtsanQrBqozDf0OfKo5N7faUgb3N0sqYiGcmuYxlWcd6_2ZsmjE9ZlZDF1frd7hdShI5urC6H4P6omtQK2oNbWUs8N7dS5ESw92sj3pDoNLaCgYKAbUSARQSFQHGX2MiQczucnmNAo_mXXmqU3ptXw0175	2025-08-01 09:34:58.56-05	Primary	UTC	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 08:34:48.651497-05	2025-08-01 08:38:47.380138-05
49ed4c6a-376e-42f5-b621-7322da319adf	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//015_9d0WhnGsECgYIARAAGAESNwF-L9IrRV3sX9KvBvHjlhi_7lNd91DSS8S8wfP824lVpGiKRHkO8CjgpHw5FjkFMBiEuKRfHkw	ya29.a0AS3H6NyYwGffHsL9_rTDvqMH9v84UhgtJk7FWGcFSwpzd0DVgcPBGocrdBZ0xCsol11CdCSGyf_JfCqtaXUaJbhFYvPkFx4rfbzlkKhMHt6cHX0EwI9ZCse19b0XNtvzd3dif53dKWG9sUp23VUJBNVrIke3CVpy30bU8iq8aCgYKAWsSARQSFQHGX2MiYmA8n0BBYnOH_9QPL3Vz5w0175	2025-08-08 21:14:54.931-05	primary	UTC	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-08 20:14:11.253769-05	2025-08-17 11:01:12.506524-05
79359217-5902-4bf9-aef2-4d940496c557	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	\N	\N	\N	primary	America/Bogota	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 07:51:49.194456-05	2025-08-01 08:14:28.043122-05
df4323a6-74e8-4b6c-98f8-7b0d535906cc	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	\N	\N	\N	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 07:28:26.014921-05	2025-08-01 08:14:28.043122-05
c6d9fbc4-c4c7-4928-9446-0dd1e0456081	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01x_i9WmO_4YVCgYIARAAGAESNwF-L9IrfpldZUjR9FeL7BKMx6EJGPVS13_Yu57mJ0BZWx3s3kx-n9oxQ0-C3CrZBCfzlac_vZw	ya29.a0AS3H6NxgOyW3tDfxXCjIyoIKbglAZ5OUsy8CBqVpbLo359Atn8n_yiDu02Lv6u9UYtLFW_XwMebT6w7HiLNEmo9uqvdIexeC38yTyv4omXz6OvtuTF36tXOjJAhsNvoks1z8ZgNLPnkTh93BBcHHOJf18lCjQKjaeJT_0e7waCgYKAb4SARQSFQHGX2Mi-XjdHFJL9SkSGkXcUDIbVw0175	2025-08-01 09:38:59.753-05	primary	UTC	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 08:38:47.385057-05	2025-08-01 21:00:52.3997-05
19b64f92-b5cc-460b-965f-78ca44fee50d	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01wrwN9CNo3ssCgYIARAAGAESNwF-L9IrSXc9MwDcrsk4LJzLizXrLYd442TKmFLy5Vtb-lrYKPMycaBRTmUeFy1HJJcUbvQ-0Mw	ya29.a0AS3H6NyCm8_d3A8Ee0YDQ87qSTUAFsNQb9WmOPETjmTS9AKQBa-LLyQhNPngW-KcoXeoJtBaz5mPAndo4fD3jpmjH1MOKEkHwVyNkssp7CGZFxIwYyUCIIOlOcg_sTvCri3UTF_VeiPUMrjyE8oxH-Pp9ewOz-k1qLGvW-L3aCgYKAacSARQSFQHGX2MifkGFm4QNO4JPhSDWVxyMhA0175	2025-08-01 08:52:01.686-05	primary	America/Bogota	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 07:51:55.754061-05	2025-08-01 08:14:28.043122-05
e4b71b0a-1964-46e3-8833-feff780f4bef	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01cELGbOIgpqXCgYIARAAGAESNwF-L9IrA1OwR8mkPkhaRAR16p5beBN5-tAjNuu6KybDm3vLZ9g060NPCBKzJSLfJ392xB5yuq8	ya29.a0AS3H6Nx-SLRIWo3oXkLYqp9v0EeR3Nifw4Lodd9YHBJk9ST6ld_Z6pnMkDk1TirJ8I9ew1N6OeWAqqDZy0kGuHEFwuhTmY-1Jb8_hukIZ5xKYOFx54I6Nrm0MFYGbyzXDmlsXltKq66nM_gfFuEe95H2jcs44xHg65QG4IJPaCgYKASoSARQSFQHGX2MiehMNxgHDfs0PbTgCmlPGWw0175	2025-08-01 08:42:13.034-05	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 07:42:06.61775-05	2025-08-01 08:14:28.043122-05
9c99847e-050f-4c31-8356-1784cd689e03	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//010Ooni9vgjBpCgYIARAAGAESNwF-L9IrJNcv2iB7TediReUNhXrygV8b3H3E8f4OoZ6DrEQPUqTPb8MLaXDzjU6SyObpEKmh5_g	ya29.a0AS3H6NwOtOds0L2orgZZ_7QN2I4f0t_mBujQ1NKRY9JWiYKBDBeu9u6H5Oi-GBS6wqIjHkacVVmGXCLP_nUugeZ_raDcv_EAziQdwGzbqG57tSPliqkKQ9KHTEGWxXeRGtQcrh8M0dJsuou5eOg6QlpS8BBJBBrbNOAauP3xaCgYKAUESARQSFQHGX2MidU7MzjVbwdpr89WCvnLsmw0175	2025-08-01 08:43:09.025-05	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 07:43:02.57231-05	2025-08-01 08:14:28.043122-05
6585046d-e54f-4829-a29d-151ee88092d9	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01exMnYsiDpARCgYIARAAGAESNwF-L9IrBi0TXrnjVIwdbG5DFnKVNsDQtMdhwQGS9h49Ziub2dSM7KL2XT-CbUV4Z6GfyyBLOY0	ya29.a0AS3H6NxGqVlw-4oenXmKf5SUGeRGPspxlTXnVLVlBjCxex5DaUPvKu-8SCQkipvjjTWV3_HiWg4fv-TKDNfzM4zDGrdxgVSqUVusIDM1jxsFRnADnVQG60EG9FVkUNFb-H3eyiDgG9-VzYLI4PZbXkJmR1GL8FPc2pXCAapGaCgYKAYoSARQSFQHGX2MiPcywXlR2VBORDdC3_l6kuw0175	2025-08-01 08:43:53.381-05	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 07:43:47.304576-05	2025-08-01 08:14:28.043122-05
f1523726-482e-45fb-91e4-6cd460bebfe0	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	\N	\N	\N	primary	America/Bogota	t	t	15	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 08:00:29.080503-05	2025-08-01 08:14:28.043122-05
2d2eb8e7-dd91-48e4-93c0-36699c084588	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01VW9kayJ4PnyCgYIARAAGAESNwF-L9IrkRdQEP7OzEQWh-f6wbfg7O1cuir7p7u12JA8VEfMoKQnWqMV-0zk87AMLZDvB9SEJAc	ya29.a0AS3H6Nyg6-Wib4yXCxKxsKeO35z1gBkS7htKiuYDu_AwTrl6g-64ZUeUcJ5VLl17GXHX5fTzzXpl4ny0wqEyOS1d-G3fR31gz_gZyEEL-GEs8EgM_JMzDPUpLQB8Nj2YhOJQ6VCQZIoEG-v2qD3GQ-tMy8fEUrcCAeICBK0TaCgYKAcYSARQSFQHGX2Mioa-bW6EcJy2w2AzWtMisng0175	2025-08-01 22:01:07.583-05	primary	UTC	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-01 21:00:52.406677-05	2025-08-08 20:14:11.248692-05
66b879bb-4065-4387-bdab-c2370cb37f1c	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01yV3CV2BEAZKCgYIARAAGAESNwF-L9IriDlAPM8eXCFjop9TVwe7ynQ7bKj98MGyM1kXqa6jPGdFfwT6EGzelTnhwr-q91w15cw	ya29.a0AS3H6Nz1ymtzLYIPNzkbh4v5CfBPatLIHPicA4IYh8CwLoFNn6xqrTDiVUzN4JmnXj5GPBN2Ki1AV_qmx1uyf8CZpwhuZ79ueMqKYaNfOmcAQsARnygyaUkHje0R4XsdNn_quGTpH-ICs93wXI79RQgnZ-rO2PFaBa09D-mfaCgYKAU8SARQSFQHGX2MiZNxgDfDW-8lpS-ldJNakKg0175	2025-08-17 12:01:54.298-05	primary	UTC	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-17 11:01:12.515695-05	2025-08-22 12:59:10.78681-05
6e6d85dc-20d0-4be2-9135-51b67fb8d40b	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01gWQ_dxTbYNNCgYIARAAGAESNwF-L9IrOfYFa8h4QbIsomcNvMiAkEDIKvDRfrYj9kQo9d5o7LVD040QJm-vpE91ICrwd2WzHMI	ya29.A0AS3H6Nw99J_8_cC67B0HqX-EgGDj1BzfXlgBA4Hj_Chs7IUJUBywWhF_9iOfkZ5oZllyE-uTOf6Mapx0nRbYSZGq_dOhEzPOjxwnc36iQXhpKnYbkkluZAhktuqnAPIL5yp526cRRtT11TowmcJcuikRBIoJ0wR6-_yvZwQo0zFylSAlWjPUTaWipJlIEfOaxy65VpAaCgYKAQYSARQSFQHGX2MiCj_ZkKfNGqtgZ4ZQncnBzw0206	2025-08-22 13:59:52.293-05	primary	UTC	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-08-22 12:59:10.795275-05	2025-09-01 18:54:14.536079-05
589a6057-95cd-4333-9246-4675aaa7a692	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01iu7vcgC4j-wCgYIARAAGAESNwF-L9Ir7Y20fnGvCnAYqax0TPeC39HCIYShJfw4GaTlXaxZ0_bbak_7x6h0XnyjNoWaX-FhB-g	ya29.A0AS3H6Nw_67kU8nm1XNmA0JmYdJ7V6bpXAv1MtQHBobJyKTM1FhsgrlJKbZ1BbaaXw55Yoppxk99wXK-b38bV4wve6idVsucCJsYWdAXcMBDlZc-Ke-yk1V3p1uG8AQ3ceqHwBGTQSrX9DyRonrMjfWXdyZ1OJwF_R1_GeOPhb-pi6fTq0o10FobKALkFexkpjqrafSwaCgYKAfUSARQSFQHGX2MiZFZZkPPILhwYMNJrDe6GBA0206	2025-09-01 19:54:26.25-05	primary	UTC	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-09-01 18:54:14.543944-05	2025-09-01 20:38:02.491752-05
797ec04f-00a3-438e-9065-a01658676269	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01vEhuqgyUKrOCgYIARAAGAESNwF-L9IrrdW61o8PY2w91t1WmZxEK0qHsgB_V41VeR1vVr56BsFvhkhG4vvmT90TP2GZGy4gYrM	ya29.a0AS3H6Nw3CF0iyRnBJJO3kgVCeyadfLrFfAV0PXsyjLgYZI8a8_mIN1rndlD0HdFkU8V-Uhf797NpGSOOFxXCQp_Mwnqf8U3SPtI4lb2XcqBSNo5tbJD2k7AZ7GPg6dJ4iJXjeFMAQaqNDh4E5o3rqQt44GADFJjlKiuVLOfGRG0YuRMVtbUC0eLCDFY2pfYsLFOJF0saCgYKAbcSARQSFQHGX2MiUpfAYscNGFZXKjC8oX-oRw0206	2025-09-13 17:48:50.647-05	primary	UTC	t	t	30	24	t	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-09-13 16:48:42.754906-05	2025-09-14 10:20:44.218392-05
f6c7f9a8-9800-4dd8-9084-99f17af579d1	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01hrN6Av6ByBxCgYIARAAGAESNwF-L9IrbekfqJSG8QbYoCLDt8rohk1UmMS1JhB0tHkBSB9X_KX7dxOLFdGkVxL6ch71ldXm6BE	ya29.A0AS3H6NyCyi3_4_RyJwRtSE7YXfRMkNOtSOxzbKtQhS4pxqYyM2zSUEitO7kEduG26YhIFigOQ8lcVzjlQhdZWTlGZ2Tw1YJcI1U6BKq-NGXIRlz8CVpHkrQApib5-Q0y8aWaUNLWN_Mg21ymy-ugJ7mEgkbIVRMrqN7giUp9Xs90lMnI4hftAMe6gq3shAH6nQzW7RkaCgYKAZISARQSFQHGX2MiE-Ef7XF-2w7FmyK5_INOEQ0206	2025-09-01 21:38:26.006-05	primary	UTC	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-09-01 20:38:02.500515-05	2025-09-13 08:31:06.796372-05
2201ce68-3273-4698-8eb6-87de61a0fcdd	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01BDaSl8VIr-SCgYIARAAGAESNwF-L9Ir3YK00NbD9uk9NV4XGkwRmlV8IrZ2OKVZ1fabKCuMZRUrITNGYA78slQrOZzQSIDcdtA	ya29.a0AS3H6NxMsDW-4gSpdEaj0NXPIMpTmy_NIdiTTya-lLGh2pr7Tr5jRn6R1G7dc7zY65l31co9h8M4tdW1M058QIphSfvPGuHSuTG3--cyVdQueu4pY0rkGLJ-zZuH3vU3Xs5-RpfVDRJIhaDqzZieXJWGynSW3v6Ny6xpLmzP8XB6bYvGbf5_jtHP6h_pW6l3j1b80tgaCgYKATUSARQSFQHGX2MiX9E9XLZQ2ueWQ59rAkFX1g0206	2025-09-13 09:31:22.034-05	primary	UTC	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-09-13 08:31:06.805312-05	2025-09-13 11:29:44.080872-05
c8d4c098-91e7-4a46-a332-a190da42122b	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01iPS83wLS4n1CgYIARAAGAESNwF-L9IrC8BCa1EFT2q_gJSMEflBav86sad1hTBwLBEPbHvcEv1GVO9g2pYg_n3buqFNOvIr6NI	ya29.a0AS3H6NyukPj8w5hOOr1wbkRx0s5ft5-H6p5DzAK8RXEfifTJNGc537a6LtvbTo9tpkqSs8i5SX04WZjICSfnijQ07p_TOmlI5cFtQhDOiF223p0vNxLYXtMKrYUCCZSaP7M6SAA3dtnoH9J9tSmQFWNfjQ6DvmxtMiAgm2i-8poxBYTF4_YOK1PEX5Js6osDVtxh2hYaCgYKAcESARQSFQHGX2Mi-ScJjqNZSROyHBXRRy0giQ0206	2025-09-13 12:30:05.541-05	primary	UTC	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-09-13 11:29:44.090025-05	2025-09-13 12:17:11.092104-05
4843452e-6164-483e-9bb8-527927f3bb67	54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com	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	http://localhost:3000/api/google-calendar/callback	1//01Ho7kyIegwFACgYIARAAGAESNwF-L9IriUfU_3hfgoICA1V558lY1ZxfRPblPuar3zbsCeju2RiJ8qRkGSo02R_SlwW2_nYXnLk	ya29.a0AS3H6NxgDsTKNayi_BW-Yows2eOKtBN2kyBTqYkrZc2PqhlC2Ph1ARCnqdTogI6dr-WHrU-j18261pUoN52-RvVYSK_ZQkm4NwHBbnCSjdzdq8wy8IOj4ihfM3phNA8gZSRTW5Ma6ZnjbXxgBwwU7keP_XMUCDUlO8ej4F3jFoZPp_e-B6gaK070Aq_a_HkCXiGyf18aCgYKAbMSARQSFQHGX2MiaoiY6E4Pg45gzSeURhf9Aw0206	2025-09-13 13:17:22.348-05	primary	UTC	t	t	30	24	f	d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	\N	\N	\N	\N	2025-09-13 12:17:11.105911-05	2025-09-13 16:48:42.746497-05
\.


--
-- Data for Name: password_resets; Type: TABLE DATA; Schema: vetplus_auth; Owner: -
--

COPY vetplus_auth.password_resets (id, id_usuario, tipo_reset, realizado_por, motivo, completado, created_at, completed_at) FROM stdin;
3552b5a3-ed04-493b-8619-72c0adfd7fc8	612b7d82-bf59-489a-8e1b-97c7dad91717	user_change	612b7d82-bf59-489a-8e1b-97c7dad91717	Cambio de contraseña temporal	t	2025-07-23 12:52:41.646609	2025-07-23 12:52:41.646609
ed739b04-9edd-481b-a89b-50799b043f34	612b7d82-bf59-489a-8e1b-97c7dad91717	user_change	612b7d82-bf59-489a-8e1b-97c7dad91717	Cambio de contraseña temporal	t	2025-08-20 21:23:33.906839	2025-08-20 21:23:33.906839
d3feb839-e9e2-4b7f-8c02-c0d1ae953842	31f56594-03da-4b11-ba03-0c0f6609e111	user_change	31f56594-03da-4b11-ba03-0c0f6609e111	Cambio de contraseña temporal	t	2025-08-21 12:27:57.707445	2025-08-21 12:27:57.707445
66dd1f5b-72c8-4987-9d7b-ab2cd45a2729	fc6a9e30-0796-47d8-904d-ef2f1eaa0b20	user_change	fc6a9e30-0796-47d8-904d-ef2f1eaa0b20	Cambio de contraseña temporal	t	2025-08-27 19:58:05.989905	2025-08-27 19:58:05.989905
\.


--
-- Data for Name: sesiones; Type: TABLE DATA; Schema: vetplus_auth; Owner: -
--

COPY vetplus_auth.sesiones (id_sesion, id_usuario, token_jti, ip_address, user_agent, expira_en, revocado, created_at) FROM stdin;
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: vetplus_auth; Owner: -
--

COPY vetplus_auth.usuarios (id_usuario, nombre, apellido, email, documento, tipo_documento, telefono, direccion, password_hash, rol, especialidad, numero_licencia, activo, ultimo_login, intentos_login, bloqueado_hasta, password_temporal, debe_cambiar_password, password_reset_date, password_reset_by, created_at, updated_at) FROM stdin;
d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c	Administrador	Administrador	admin@vetplus.com	12345678	CC	\N	\N	$2b$10$B7X7FlDADo3dasaTF3.6O.DB4Bl1H5mE3.I3RR.vRb8lSiO.gIvhi	admin	\N	\N	t	2025-09-17 20:50:28.420533	0	\N	f	f	\N	\N	2025-07-23 12:43:22.495009	2025-09-17 20:50:28.420533
612b7d82-bf59-489a-8e1b-97c7dad91717	Juan Carlos	Perez	vet@vetplus.com	87654321	CC	\N	\N	$2b$12$fm8JRHtFFRglQVrYBebeN.4qlcyo5odPA2VkdUFd6MN6BFCi7eCRC	vet	Medicina Interna	VET-12345	t	2025-08-20 21:23:53.631323	0	\N	f	f	\N	\N	2025-07-23 12:44:56.843052	2025-08-20 21:23:53.631323
31f56594-03da-4b11-ba03-0c0f6609e111	diego	sanchez	diego@correo.com	1054988359	CC	3052621653	Manizales	$2b$12$/2JZ.XprRUxVUzucGuKqt.oD2zhRFgQ5qLUkIeSVFWoIMlPf2lrpa	aux_admin			t	2025-09-13 11:27:47.320113	0	\N	f	f	\N	\N	2025-08-01 22:13:31.954719	2025-09-13 11:27:47.320113
fc6a9e30-0796-47d8-904d-ef2f1eaa0b20	maria fernanda	grisales	mariaf@correo.com	10111213	CC	3001234567	\N	$2b$12$t6xI6fmJEcZKVsROU7FgoOx7B2JvH6rXYRsMERRz7tKylu7SZZ/pG	vet	Medicina General	vet001	t	2025-09-13 11:28:39.159603	0	\N	f	f	\N	\N	2025-08-01 21:34:12.746994	2025-09-13 11:28:39.159603
\.


--
-- Name: google_calendar_audit_log_id_seq; Type: SEQUENCE SET; Schema: clinical; Owner: -
--

SELECT pg_catalog.setval('clinical.google_calendar_audit_log_id_seq', 93, true);


--
-- Name: calendario_citas calendario_citas_codigo_cita_key; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.calendario_citas
    ADD CONSTRAINT calendario_citas_codigo_cita_key UNIQUE (codigo_cita);


--
-- Name: calendario_citas calendario_citas_pkey; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.calendario_citas
    ADD CONSTRAINT calendario_citas_pkey PRIMARY KEY (id_cita);


--
-- Name: clientes clientes_cedula_key; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.clientes
    ADD CONSTRAINT clientes_cedula_key UNIQUE (cedula);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente);


--
-- Name: consultas_clinicas consultas_clinicas_codigo_consulta_key; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.consultas_clinicas
    ADD CONSTRAINT consultas_clinicas_codigo_consulta_key UNIQUE (codigo_consulta);


--
-- Name: consultas_clinicas consultas_clinicas_pkey; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.consultas_clinicas
    ADD CONSTRAINT consultas_clinicas_pkey PRIMARY KEY (id_consulta);


--
-- Name: google_calendar_audit_log google_calendar_audit_log_pkey; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.google_calendar_audit_log
    ADD CONSTRAINT google_calendar_audit_log_pkey PRIMARY KEY (id);


--
-- Name: mascotas mascotas_pkey; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.mascotas
    ADD CONSTRAINT mascotas_pkey PRIMARY KEY (id_mascota);


--
-- Name: vacunas_tratamientos vacunas_tratamientos_pkey; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.vacunas_tratamientos
    ADD CONSTRAINT vacunas_tratamientos_pkey PRIMARY KEY (id_vacuna);


--
-- Name: cajas cajas_nombre_key; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.cajas
    ADD CONSTRAINT cajas_nombre_key UNIQUE (nombre);


--
-- Name: cajas cajas_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.cajas
    ADD CONSTRAINT cajas_pkey PRIMARY KEY (id_caja);


--
-- Name: categorias_egresos categorias_egresos_codigo_key; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.categorias_egresos
    ADD CONSTRAINT categorias_egresos_codigo_key UNIQUE (codigo);


--
-- Name: categorias_egresos categorias_egresos_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.categorias_egresos
    ADD CONSTRAINT categorias_egresos_pkey PRIMARY KEY (id_categoria);


--
-- Name: categorias_ingresos categorias_ingresos_codigo_key; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.categorias_ingresos
    ADD CONSTRAINT categorias_ingresos_codigo_key UNIQUE (codigo);


--
-- Name: categorias_ingresos categorias_ingresos_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.categorias_ingresos
    ADD CONSTRAINT categorias_ingresos_pkey PRIMARY KEY (id_categoria);


--
-- Name: conceptos_egresos conceptos_egresos_codigo_key; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.conceptos_egresos
    ADD CONSTRAINT conceptos_egresos_codigo_key UNIQUE (codigo);


--
-- Name: conceptos_egresos conceptos_egresos_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.conceptos_egresos
    ADD CONSTRAINT conceptos_egresos_pkey PRIMARY KEY (id_concepto);


--
-- Name: conceptos_ingresos conceptos_ingresos_codigo_key; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.conceptos_ingresos
    ADD CONSTRAINT conceptos_ingresos_codigo_key UNIQUE (codigo);


--
-- Name: conceptos_ingresos conceptos_ingresos_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.conceptos_ingresos
    ADD CONSTRAINT conceptos_ingresos_pkey PRIMARY KEY (id_concepto);


--
-- Name: control_terapias control_terapias_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.control_terapias
    ADD CONSTRAINT control_terapias_pkey PRIMARY KEY (id_control);


--
-- Name: egresos egresos_codigo_egreso_key; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.egresos
    ADD CONSTRAINT egresos_codigo_egreso_key UNIQUE (codigo_egreso);


--
-- Name: egresos egresos_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.egresos
    ADD CONSTRAINT egresos_pkey PRIMARY KEY (id_egreso);


--
-- Name: facturas_venta facturas_venta_codigo_factura_key; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.facturas_venta
    ADD CONSTRAINT facturas_venta_codigo_factura_key UNIQUE (codigo_factura);


--
-- Name: facturas_venta facturas_venta_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.facturas_venta
    ADD CONSTRAINT facturas_venta_pkey PRIMARY KEY (id_factura);


--
-- Name: ingresos ingresos_codigo_ingreso_key; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.ingresos
    ADD CONSTRAINT ingresos_codigo_ingreso_key UNIQUE (codigo_ingreso);


--
-- Name: ingresos ingresos_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.ingresos
    ADD CONSTRAINT ingresos_pkey PRIMARY KEY (id_ingreso);


--
-- Name: lineas_factura lineas_factura_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.lineas_factura
    ADD CONSTRAINT lineas_factura_pkey PRIMARY KEY (id_linea);


--
-- Name: lineas_orden_compra lineas_orden_compra_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.lineas_orden_compra
    ADD CONSTRAINT lineas_orden_compra_pkey PRIMARY KEY (id_linea);


--
-- Name: ordenes_compra ordenes_compra_codigo_orden_key; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.ordenes_compra
    ADD CONSTRAINT ordenes_compra_codigo_orden_key UNIQUE (codigo_orden);


--
-- Name: ordenes_compra ordenes_compra_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.ordenes_compra
    ADD CONSTRAINT ordenes_compra_pkey PRIMARY KEY (id_orden);


--
-- Name: productos productos_codigo_barras_key; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.productos
    ADD CONSTRAINT productos_codigo_barras_key UNIQUE (codigo_barras);


--
-- Name: productos productos_codigo_key; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.productos
    ADD CONSTRAINT productos_codigo_key UNIQUE (codigo);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id_producto);


--
-- Name: proveedores proveedores_nit_key; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.proveedores
    ADD CONSTRAINT proveedores_nit_key UNIQUE (nit);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id_proveedor);


--
-- Name: sesiones_terapia sesiones_terapia_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.sesiones_terapia
    ADD CONSTRAINT sesiones_terapia_pkey PRIMARY KEY (id_sesion);


--
-- Name: transferencias_cajas transferencias_cajas_codigo_transferencia_key; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.transferencias_cajas
    ADD CONSTRAINT transferencias_cajas_codigo_transferencia_key UNIQUE (codigo_transferencia);


--
-- Name: transferencias_cajas transferencias_cajas_pkey; Type: CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.transferencias_cajas
    ADD CONSTRAINT transferencias_cajas_pkey PRIMARY KEY (id_transferencia);


--
-- Name: blacklisted_tokens blacklisted_tokens_pkey; Type: CONSTRAINT; Schema: vetplus_auth; Owner: -
--

ALTER TABLE ONLY vetplus_auth.blacklisted_tokens
    ADD CONSTRAINT blacklisted_tokens_pkey PRIMARY KEY (id_token);


--
-- Name: google_calendar_config google_calendar_config_pkey; Type: CONSTRAINT; Schema: vetplus_auth; Owner: -
--

ALTER TABLE ONLY vetplus_auth.google_calendar_config
    ADD CONSTRAINT google_calendar_config_pkey PRIMARY KEY (id_config);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: vetplus_auth; Owner: -
--

ALTER TABLE ONLY vetplus_auth.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: sesiones sesiones_pkey; Type: CONSTRAINT; Schema: vetplus_auth; Owner: -
--

ALTER TABLE ONLY vetplus_auth.sesiones
    ADD CONSTRAINT sesiones_pkey PRIMARY KEY (id_sesion);


--
-- Name: sesiones sesiones_token_jti_key; Type: CONSTRAINT; Schema: vetplus_auth; Owner: -
--

ALTER TABLE ONLY vetplus_auth.sesiones
    ADD CONSTRAINT sesiones_token_jti_key UNIQUE (token_jti);


--
-- Name: usuarios usuarios_documento_key; Type: CONSTRAINT; Schema: vetplus_auth; Owner: -
--

ALTER TABLE ONLY vetplus_auth.usuarios
    ADD CONSTRAINT usuarios_documento_key UNIQUE (documento);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: vetplus_auth; Owner: -
--

ALTER TABLE ONLY vetplus_auth.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: vetplus_auth; Owner: -
--

ALTER TABLE ONLY vetplus_auth.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);


--
-- Name: idx_citas_consulta; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_citas_consulta ON clinical.calendario_citas USING btree (id_consulta);


--
-- Name: idx_citas_estado; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_citas_estado ON clinical.calendario_citas USING btree (estado);


--
-- Name: idx_citas_fecha; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_citas_fecha ON clinical.calendario_citas USING btree (fecha_inicio);


--
-- Name: idx_citas_google_event_id; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_citas_google_event_id ON clinical.calendario_citas USING btree (google_event_id);


--
-- Name: idx_citas_google_sync_status; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_citas_google_sync_status ON clinical.calendario_citas USING btree (google_sync_status);


--
-- Name: idx_citas_mascota; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_citas_mascota ON clinical.calendario_citas USING btree (id_mascota);


--
-- Name: idx_citas_veterinario; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_citas_veterinario ON clinical.calendario_citas USING btree (id_veterinario);


--
-- Name: idx_clientes_cedula; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_clientes_cedula ON clinical.clientes USING btree (cedula);


--
-- Name: idx_clientes_nombre; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_clientes_nombre ON clinical.clientes USING btree (nombre);


--
-- Name: idx_consultas_cita; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_consultas_cita ON clinical.consultas_clinicas USING btree (id_cita);


--
-- Name: idx_consultas_fecha; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_consultas_fecha ON clinical.consultas_clinicas USING btree (fecha);


--
-- Name: idx_consultas_mascota; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_consultas_mascota ON clinical.consultas_clinicas USING btree (id_mascota);


--
-- Name: idx_consultas_veterinario; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_consultas_veterinario ON clinical.consultas_clinicas USING btree (id_veterinario);


--
-- Name: idx_google_audit_action; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_google_audit_action ON clinical.google_calendar_audit_log USING btree (action_type);


--
-- Name: idx_google_audit_appointment; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_google_audit_appointment ON clinical.google_calendar_audit_log USING btree (appointment_id);


--
-- Name: idx_google_audit_date; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_google_audit_date ON clinical.google_calendar_audit_log USING btree (created_at);


--
-- Name: idx_mascotas_cliente; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_mascotas_cliente ON clinical.mascotas USING btree (id_cliente);


--
-- Name: idx_mascotas_especie; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_mascotas_especie ON clinical.mascotas USING btree (especie);


--
-- Name: idx_mascotas_nombre; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_mascotas_nombre ON clinical.mascotas USING btree (nombre);


--
-- Name: idx_vacunas_mascota; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_vacunas_mascota ON clinical.vacunas_tratamientos USING btree (id_mascota);


--
-- Name: idx_cajas_activa; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_cajas_activa ON financial.cajas USING btree (activa);


--
-- Name: idx_categorias_egresos_codigo; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_categorias_egresos_codigo ON financial.categorias_egresos USING btree (codigo);


--
-- Name: idx_categorias_ingresos_codigo; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_categorias_ingresos_codigo ON financial.categorias_ingresos USING btree (codigo);


--
-- Name: idx_conceptos_egresos_categoria; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_conceptos_egresos_categoria ON financial.conceptos_egresos USING btree (id_categoria);


--
-- Name: idx_conceptos_ingresos_categoria; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_conceptos_ingresos_categoria ON financial.conceptos_ingresos USING btree (id_categoria);


--
-- Name: idx_control_activo; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_control_activo ON financial.control_terapias USING btree (activo);


--
-- Name: idx_control_mascota; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_control_mascota ON financial.control_terapias USING btree (id_mascota);


--
-- Name: idx_egresos_caja; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_egresos_caja ON financial.egresos USING btree (id_caja);


--
-- Name: idx_egresos_categoria; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_egresos_categoria ON financial.egresos USING btree (categoria);


--
-- Name: idx_egresos_concepto; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_egresos_concepto ON financial.egresos USING btree (id_concepto_egreso);


--
-- Name: idx_egresos_fecha; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_egresos_fecha ON financial.egresos USING btree (fecha);


--
-- Name: idx_facturas_cliente; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_facturas_cliente ON financial.facturas_venta USING btree (id_cliente);


--
-- Name: idx_facturas_consulta; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_facturas_consulta ON financial.facturas_venta USING btree (id_consulta);


--
-- Name: idx_facturas_estado; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_facturas_estado ON financial.facturas_venta USING btree (estado);


--
-- Name: idx_facturas_fecha; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_facturas_fecha ON financial.facturas_venta USING btree (fecha);


--
-- Name: idx_ingresos_caja; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_ingresos_caja ON financial.ingresos USING btree (id_caja);


--
-- Name: idx_ingresos_concepto; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_ingresos_concepto ON financial.ingresos USING btree (id_concepto_ingreso);


--
-- Name: idx_ingresos_fecha; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_ingresos_fecha ON financial.ingresos USING btree (fecha);


--
-- Name: idx_ordenes_estado; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_ordenes_estado ON financial.ordenes_compra USING btree (estado);


--
-- Name: idx_ordenes_proveedor; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_ordenes_proveedor ON financial.ordenes_compra USING btree (id_proveedor);


--
-- Name: idx_ordenes_vencimiento; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_ordenes_vencimiento ON financial.ordenes_compra USING btree (fecha_vencimiento);


--
-- Name: idx_productos_codigo; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_productos_codigo ON financial.productos USING btree (codigo);


--
-- Name: idx_productos_codigo_barras; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_productos_codigo_barras ON financial.productos USING btree (codigo_barras);


--
-- Name: idx_productos_inventariable; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_productos_inventariable ON financial.productos USING btree (inventariable);


--
-- Name: idx_productos_tipo; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_productos_tipo ON financial.productos USING btree (tipo);


--
-- Name: idx_proveedores_activo; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_proveedores_activo ON financial.proveedores USING btree (activo);


--
-- Name: idx_sesiones_control; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_sesiones_control ON financial.sesiones_terapia USING btree (id_control);


--
-- Name: idx_sesiones_fecha; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_sesiones_fecha ON financial.sesiones_terapia USING btree (fecha_sesion);


--
-- Name: idx_sesiones_realizador; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_sesiones_realizador ON financial.sesiones_terapia USING btree (realizada_por);


--
-- Name: idx_transferencias_destino; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_transferencias_destino ON financial.transferencias_cajas USING btree (id_caja_destino);


--
-- Name: idx_transferencias_fecha; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_transferencias_fecha ON financial.transferencias_cajas USING btree (fecha);


--
-- Name: idx_transferencias_origen; Type: INDEX; Schema: financial; Owner: -
--

CREATE INDEX idx_transferencias_origen ON financial.transferencias_cajas USING btree (id_caja_origen);


--
-- Name: idx_blacklisted_tokens_created; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE INDEX idx_blacklisted_tokens_created ON vetplus_auth.blacklisted_tokens USING btree (created_at);


--
-- Name: idx_blacklisted_tokens_token; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE INDEX idx_blacklisted_tokens_token ON vetplus_auth.blacklisted_tokens USING btree (token);


--
-- Name: idx_google_calendar_config_active; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE INDEX idx_google_calendar_config_active ON vetplus_auth.google_calendar_config USING btree (is_active);


--
-- Name: idx_google_calendar_config_configured_by; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE INDEX idx_google_calendar_config_configured_by ON vetplus_auth.google_calendar_config USING btree (configured_by);


--
-- Name: idx_google_calendar_config_single_active; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE UNIQUE INDEX idx_google_calendar_config_single_active ON vetplus_auth.google_calendar_config USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_google_calendar_webhook_channel; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE INDEX idx_google_calendar_webhook_channel ON vetplus_auth.google_calendar_config USING btree (webhook_channel_id) WHERE (webhook_channel_id IS NOT NULL);


--
-- Name: idx_password_resets_admin; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE INDEX idx_password_resets_admin ON vetplus_auth.password_resets USING btree (realizado_por);


--
-- Name: idx_password_resets_date; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE INDEX idx_password_resets_date ON vetplus_auth.password_resets USING btree (created_at);


--
-- Name: idx_password_resets_usuario; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE INDEX idx_password_resets_usuario ON vetplus_auth.password_resets USING btree (id_usuario);


--
-- Name: idx_sesiones_token; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE INDEX idx_sesiones_token ON vetplus_auth.sesiones USING btree (token_jti);


--
-- Name: idx_sesiones_usuario; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE INDEX idx_sesiones_usuario ON vetplus_auth.sesiones USING btree (id_usuario);


--
-- Name: idx_usuarios_activo; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE INDEX idx_usuarios_activo ON vetplus_auth.usuarios USING btree (activo);


--
-- Name: idx_usuarios_email; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE INDEX idx_usuarios_email ON vetplus_auth.usuarios USING btree (email);


--
-- Name: idx_usuarios_password_temporal; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE INDEX idx_usuarios_password_temporal ON vetplus_auth.usuarios USING btree (password_temporal);


--
-- Name: idx_usuarios_rol; Type: INDEX; Schema: vetplus_auth; Owner: -
--

CREATE INDEX idx_usuarios_rol ON vetplus_auth.usuarios USING btree (rol);


--
-- Name: calendario_citas audit_citas; Type: TRIGGER; Schema: clinical; Owner: -
--

CREATE TRIGGER audit_citas AFTER INSERT OR DELETE OR UPDATE ON clinical.calendario_citas FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: clientes audit_clientes; Type: TRIGGER; Schema: clinical; Owner: -
--

CREATE TRIGGER audit_clientes AFTER INSERT OR DELETE OR UPDATE ON clinical.clientes FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: consultas_clinicas audit_consultas; Type: TRIGGER; Schema: clinical; Owner: -
--

CREATE TRIGGER audit_consultas AFTER INSERT OR DELETE OR UPDATE ON clinical.consultas_clinicas FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: mascotas audit_mascotas; Type: TRIGGER; Schema: clinical; Owner: -
--

CREATE TRIGGER audit_mascotas AFTER INSERT OR DELETE OR UPDATE ON clinical.mascotas FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: calendario_citas tr_audit_google_calendar_sync; Type: TRIGGER; Schema: clinical; Owner: -
--

CREATE TRIGGER tr_audit_google_calendar_sync AFTER UPDATE ON clinical.calendario_citas FOR EACH ROW EXECUTE FUNCTION public.audit_google_calendar_sync();


--
-- Name: calendario_citas update_calendario_updated_at; Type: TRIGGER; Schema: clinical; Owner: -
--

CREATE TRIGGER update_calendario_updated_at BEFORE UPDATE ON clinical.calendario_citas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clientes update_clientes_updated_at; Type: TRIGGER; Schema: clinical; Owner: -
--

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clinical.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: consultas_clinicas update_consultas_updated_at; Type: TRIGGER; Schema: clinical; Owner: -
--

CREATE TRIGGER update_consultas_updated_at BEFORE UPDATE ON clinical.consultas_clinicas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mascotas update_mascotas_updated_at; Type: TRIGGER; Schema: clinical; Owner: -
--

CREATE TRIGGER update_mascotas_updated_at BEFORE UPDATE ON clinical.mascotas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cajas audit_cajas; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER audit_cajas AFTER INSERT OR DELETE OR UPDATE ON financial.cajas FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: control_terapias audit_control_terapias; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER audit_control_terapias AFTER INSERT OR DELETE OR UPDATE ON financial.control_terapias FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: egresos audit_egresos; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER audit_egresos AFTER INSERT OR DELETE OR UPDATE ON financial.egresos FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: facturas_venta audit_facturas; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER audit_facturas AFTER INSERT OR DELETE OR UPDATE ON financial.facturas_venta FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: ingresos audit_ingresos; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER audit_ingresos AFTER INSERT OR DELETE OR UPDATE ON financial.ingresos FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: lineas_factura audit_lineas_factura; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER audit_lineas_factura AFTER INSERT OR DELETE OR UPDATE ON financial.lineas_factura FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: lineas_orden_compra audit_lineas_orden; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER audit_lineas_orden AFTER INSERT OR DELETE OR UPDATE ON financial.lineas_orden_compra FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: ordenes_compra audit_ordenes; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER audit_ordenes AFTER INSERT OR DELETE OR UPDATE ON financial.ordenes_compra FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: productos audit_productos; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER audit_productos AFTER INSERT OR DELETE OR UPDATE ON financial.productos FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: proveedores audit_proveedores; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER audit_proveedores AFTER INSERT OR DELETE OR UPDATE ON financial.proveedores FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: facturas_venta trigger_ingreso_factura; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER trigger_ingreso_factura AFTER INSERT ON financial.facturas_venta FOR EACH ROW EXECUTE FUNCTION public.create_ingreso_from_factura();

ALTER TABLE financial.facturas_venta DISABLE TRIGGER trigger_ingreso_factura;


--
-- Name: lineas_factura trigger_stock_factura_venta; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER trigger_stock_factura_venta AFTER INSERT ON financial.lineas_factura FOR EACH ROW EXECUTE FUNCTION public.update_stock_producto();


--
-- Name: lineas_orden_compra trigger_stock_orden_compra; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER trigger_stock_orden_compra AFTER INSERT ON financial.lineas_orden_compra FOR EACH ROW EXECUTE FUNCTION public.update_stock_producto();


--
-- Name: egresos trigger_update_saldo_egreso; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER trigger_update_saldo_egreso AFTER INSERT OR DELETE OR UPDATE ON financial.egresos FOR EACH ROW EXECUTE FUNCTION public.update_caja_saldo_egreso();


--
-- Name: ingresos trigger_update_saldo_ingreso; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER trigger_update_saldo_ingreso AFTER INSERT OR DELETE OR UPDATE ON financial.ingresos FOR EACH ROW EXECUTE FUNCTION public.update_caja_saldo_ingreso();

ALTER TABLE financial.ingresos DISABLE TRIGGER trigger_update_saldo_ingreso;


--
-- Name: cajas update_cajas_updated_at; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER update_cajas_updated_at BEFORE UPDATE ON financial.cajas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: control_terapias update_control_terapias_updated_at; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER update_control_terapias_updated_at BEFORE UPDATE ON financial.control_terapias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ordenes_compra update_ordenes_updated_at; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER update_ordenes_updated_at BEFORE UPDATE ON financial.ordenes_compra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: productos update_productos_updated_at; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON financial.productos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: proveedores update_proveedores_updated_at; Type: TRIGGER; Schema: financial; Owner: -
--

CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON financial.proveedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: usuarios audit_usuarios; Type: TRIGGER; Schema: vetplus_auth; Owner: -
--

CREATE TRIGGER audit_usuarios AFTER INSERT OR DELETE OR UPDATE ON vetplus_auth.usuarios FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: google_calendar_config tr_audit_google_calendar_config; Type: TRIGGER; Schema: vetplus_auth; Owner: -
--

CREATE TRIGGER tr_audit_google_calendar_config AFTER INSERT OR DELETE OR UPDATE ON vetplus_auth.google_calendar_config FOR EACH ROW EXECUTE FUNCTION public.audit_google_calendar_config();


--
-- Name: google_calendar_config tr_google_calendar_config_updated_at; Type: TRIGGER; Schema: vetplus_auth; Owner: -
--

CREATE TRIGGER tr_google_calendar_config_updated_at BEFORE UPDATE ON vetplus_auth.google_calendar_config FOR EACH ROW EXECUTE FUNCTION public.update_google_calendar_config_updated_at();


--
-- Name: usuarios update_usuarios_updated_at; Type: TRIGGER; Schema: vetplus_auth; Owner: -
--

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON vetplus_auth.usuarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: calendario_citas calendario_citas_id_consulta_fkey; Type: FK CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.calendario_citas
    ADD CONSTRAINT calendario_citas_id_consulta_fkey FOREIGN KEY (id_consulta) REFERENCES clinical.consultas_clinicas(id_consulta);


--
-- Name: calendario_citas calendario_citas_id_mascota_fkey; Type: FK CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.calendario_citas
    ADD CONSTRAINT calendario_citas_id_mascota_fkey FOREIGN KEY (id_mascota) REFERENCES clinical.mascotas(id_mascota);


--
-- Name: consultas_clinicas consultas_clinicas_id_cita_fkey; Type: FK CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.consultas_clinicas
    ADD CONSTRAINT consultas_clinicas_id_cita_fkey FOREIGN KEY (id_cita) REFERENCES clinical.calendario_citas(id_cita);


--
-- Name: consultas_clinicas consultas_clinicas_id_mascota_fkey; Type: FK CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.consultas_clinicas
    ADD CONSTRAINT consultas_clinicas_id_mascota_fkey FOREIGN KEY (id_mascota) REFERENCES clinical.mascotas(id_mascota);


--
-- Name: google_calendar_audit_log google_calendar_audit_log_appointment_id_fkey; Type: FK CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.google_calendar_audit_log
    ADD CONSTRAINT google_calendar_audit_log_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES clinical.calendario_citas(id_cita);


--
-- Name: mascotas mascotas_id_cliente_fkey; Type: FK CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.mascotas
    ADD CONSTRAINT mascotas_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES clinical.clientes(id_cliente) ON DELETE CASCADE;


--
-- Name: vacunas_tratamientos vacunas_tratamientos_id_mascota_fkey; Type: FK CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.vacunas_tratamientos
    ADD CONSTRAINT vacunas_tratamientos_id_mascota_fkey FOREIGN KEY (id_mascota) REFERENCES clinical.mascotas(id_mascota);


--
-- Name: conceptos_egresos conceptos_egresos_id_categoria_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.conceptos_egresos
    ADD CONSTRAINT conceptos_egresos_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES financial.categorias_egresos(id_categoria);


--
-- Name: conceptos_ingresos conceptos_ingresos_id_categoria_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.conceptos_ingresos
    ADD CONSTRAINT conceptos_ingresos_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES financial.categorias_ingresos(id_categoria);


--
-- Name: control_terapias control_terapias_id_factura_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.control_terapias
    ADD CONSTRAINT control_terapias_id_factura_fkey FOREIGN KEY (id_factura) REFERENCES financial.facturas_venta(id_factura);


--
-- Name: control_terapias control_terapias_id_mascota_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.control_terapias
    ADD CONSTRAINT control_terapias_id_mascota_fkey FOREIGN KEY (id_mascota) REFERENCES clinical.mascotas(id_mascota);


--
-- Name: control_terapias control_terapias_id_producto_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.control_terapias
    ADD CONSTRAINT control_terapias_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES financial.productos(id_producto);


--
-- Name: egresos egresos_id_caja_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.egresos
    ADD CONSTRAINT egresos_id_caja_fkey FOREIGN KEY (id_caja) REFERENCES financial.cajas(id_caja);


--
-- Name: egresos egresos_id_concepto_egreso_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.egresos
    ADD CONSTRAINT egresos_id_concepto_egreso_fkey FOREIGN KEY (id_concepto_egreso) REFERENCES financial.conceptos_egresos(id_concepto);


--
-- Name: facturas_venta facturas_venta_id_caja_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.facturas_venta
    ADD CONSTRAINT facturas_venta_id_caja_fkey FOREIGN KEY (id_caja) REFERENCES financial.cajas(id_caja);


--
-- Name: facturas_venta facturas_venta_id_cliente_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.facturas_venta
    ADD CONSTRAINT facturas_venta_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES clinical.clientes(id_cliente);


--
-- Name: facturas_venta facturas_venta_id_consulta_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.facturas_venta
    ADD CONSTRAINT facturas_venta_id_consulta_fkey FOREIGN KEY (id_consulta) REFERENCES clinical.consultas_clinicas(id_consulta);


--
-- Name: egresos fk_egresos_orden_compra; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.egresos
    ADD CONSTRAINT fk_egresos_orden_compra FOREIGN KEY (id_orden_compra) REFERENCES financial.ordenes_compra(id_orden) ON DELETE SET NULL;


--
-- Name: ingresos ingresos_id_caja_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.ingresos
    ADD CONSTRAINT ingresos_id_caja_fkey FOREIGN KEY (id_caja) REFERENCES financial.cajas(id_caja);


--
-- Name: ingresos ingresos_id_concepto_ingreso_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.ingresos
    ADD CONSTRAINT ingresos_id_concepto_ingreso_fkey FOREIGN KEY (id_concepto_ingreso) REFERENCES financial.conceptos_ingresos(id_concepto);


--
-- Name: lineas_factura lineas_factura_id_factura_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.lineas_factura
    ADD CONSTRAINT lineas_factura_id_factura_fkey FOREIGN KEY (id_factura) REFERENCES financial.facturas_venta(id_factura) ON DELETE CASCADE;


--
-- Name: lineas_factura lineas_factura_id_producto_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.lineas_factura
    ADD CONSTRAINT lineas_factura_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES financial.productos(id_producto);


--
-- Name: lineas_orden_compra lineas_orden_compra_id_orden_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.lineas_orden_compra
    ADD CONSTRAINT lineas_orden_compra_id_orden_fkey FOREIGN KEY (id_orden) REFERENCES financial.ordenes_compra(id_orden) ON DELETE CASCADE;


--
-- Name: lineas_orden_compra lineas_orden_compra_id_producto_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.lineas_orden_compra
    ADD CONSTRAINT lineas_orden_compra_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES financial.productos(id_producto);


--
-- Name: ordenes_compra ordenes_compra_id_proveedor_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.ordenes_compra
    ADD CONSTRAINT ordenes_compra_id_proveedor_fkey FOREIGN KEY (id_proveedor) REFERENCES financial.proveedores(id_proveedor);


--
-- Name: sesiones_terapia sesiones_terapia_id_control_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.sesiones_terapia
    ADD CONSTRAINT sesiones_terapia_id_control_fkey FOREIGN KEY (id_control) REFERENCES financial.control_terapias(id_control) ON DELETE CASCADE;


--
-- Name: transferencias_cajas transferencias_cajas_created_by_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.transferencias_cajas
    ADD CONSTRAINT transferencias_cajas_created_by_fkey FOREIGN KEY (created_by) REFERENCES vetplus_auth.usuarios(id_usuario);


--
-- Name: transferencias_cajas transferencias_cajas_id_caja_destino_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.transferencias_cajas
    ADD CONSTRAINT transferencias_cajas_id_caja_destino_fkey FOREIGN KEY (id_caja_destino) REFERENCES financial.cajas(id_caja);


--
-- Name: transferencias_cajas transferencias_cajas_id_caja_origen_fkey; Type: FK CONSTRAINT; Schema: financial; Owner: -
--

ALTER TABLE ONLY financial.transferencias_cajas
    ADD CONSTRAINT transferencias_cajas_id_caja_origen_fkey FOREIGN KEY (id_caja_origen) REFERENCES financial.cajas(id_caja);


--
-- Name: blacklisted_tokens blacklisted_tokens_id_usuario_fkey; Type: FK CONSTRAINT; Schema: vetplus_auth; Owner: -
--

ALTER TABLE ONLY vetplus_auth.blacklisted_tokens
    ADD CONSTRAINT blacklisted_tokens_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES vetplus_auth.usuarios(id_usuario);


--
-- Name: usuarios fk_password_reset_by; Type: FK CONSTRAINT; Schema: vetplus_auth; Owner: -
--

ALTER TABLE ONLY vetplus_auth.usuarios
    ADD CONSTRAINT fk_password_reset_by FOREIGN KEY (password_reset_by) REFERENCES vetplus_auth.usuarios(id_usuario);


--
-- Name: google_calendar_config google_calendar_config_configured_by_fkey; Type: FK CONSTRAINT; Schema: vetplus_auth; Owner: -
--

ALTER TABLE ONLY vetplus_auth.google_calendar_config
    ADD CONSTRAINT google_calendar_config_configured_by_fkey FOREIGN KEY (configured_by) REFERENCES vetplus_auth.usuarios(id_usuario);


--
-- Name: password_resets password_resets_id_usuario_fkey; Type: FK CONSTRAINT; Schema: vetplus_auth; Owner: -
--

ALTER TABLE ONLY vetplus_auth.password_resets
    ADD CONSTRAINT password_resets_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES vetplus_auth.usuarios(id_usuario);


--
-- Name: password_resets password_resets_realizado_por_fkey; Type: FK CONSTRAINT; Schema: vetplus_auth; Owner: -
--

ALTER TABLE ONLY vetplus_auth.password_resets
    ADD CONSTRAINT password_resets_realizado_por_fkey FOREIGN KEY (realizado_por) REFERENCES vetplus_auth.usuarios(id_usuario);


--
-- Name: sesiones sesiones_id_usuario_fkey; Type: FK CONSTRAINT; Schema: vetplus_auth; Owner: -
--

ALTER TABLE ONLY vetplus_auth.sesiones
    ADD CONSTRAINT sesiones_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES vetplus_auth.usuarios(id_usuario) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

