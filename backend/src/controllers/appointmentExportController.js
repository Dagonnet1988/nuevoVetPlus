import { query } from '../config/database.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

class AppointmentExportController {
    
    /**
     * Exportar agenda en formato PDF
     */
    async exportAgendaPDF(req, res) {
        try {
            const { 
                veterinario_id, 
                fecha_inicio, 
                fecha_fin, 
                formato = 'individual' 
            } = req.query;

            console.log('📄 Exportando agenda PDF:', {
                veterinario_id,
                fecha_inicio,
                fecha_fin,
                formato
            });

            // Validar parámetros requeridos
            if (!fecha_inicio || !fecha_fin) {
                return res.status(400).json({
                    success: false,
                    message: 'Fecha de inicio y fin son requeridas'
                });
            }

            // Obtener datos según el formato
            let agendaData;
            if (formato === 'consolidada') {
                agendaData = await this.getConsolidatedAgenda(fecha_inicio, fecha_fin);
            } else {
                if (!veterinario_id) {
                    return res.status(400).json({
                        success: false,
                        message: 'ID del veterinario es requerido para agenda individual'
                    });
                }
                agendaData = await this.getIndividualAgenda(veterinario_id, fecha_inicio, fecha_fin);
            }

            // Generar PDF simple sin configuraciones complejas
            const doc = new PDFDocument({ 
                margin: 40,
                size: 'A4',
                layout: 'portrait'
            });
            
            // Configurar headers de respuesta simples
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="agenda_${formato}_${fecha_inicio}_${fecha_fin}.pdf"`);
            
            // Pipe del PDF a la respuesta
            doc.pipe(res);

            // Generar contenido del PDF
            await this.generatePDFContent(doc, agendaData, formato);

            // Finalizar el documento
            doc.end();

        } catch (error) {
            console.error('Error exportando agenda PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    /**
     * Obtener agenda individual de un veterinario
     */
    async getIndividualAgenda(veterinarioId, fechaInicio, fechaFin) {
        // Agregar logging para debug de fechas
        console.log('🗓️ Fechas originales:', { fechaInicio, fechaFin });
        
        // Convertir fechas correctamente con zona horaria de Colombia
        const fechaInicioISO = this.convertToColombianDate(fechaInicio);
        const fechaFinISO = this.convertToColombianDate(fechaFin);
        
        // Construir timestamps completos - MEJOR: usar fechas sin timezone
        const fechaInicioCompleta = `${fechaInicioISO} 00:00:00`;
        const fechaFinCompleta = `${fechaFinISO} 23:59:59`;
        
        console.log('🗓️ Fechas para consulta (Colombia):', { 
            fechaInicioCompleta, 
            fechaFinCompleta,
            fechaInicioISO,
            fechaFinISO 
        });

        const appointmentsQuery = `
            SELECT 
                c.id_cita,
                c.codigo_cita,
                c.fecha_inicio,
                c.fecha_fin,
                DATE(c.fecha_inicio AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') as fecha_local,
                c.fecha_inicio AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota' as fecha_inicio_colombia,
                c.tipo,
                c.motivo,
                c.estado,
                c.notas,
                m.nombre as mascota_nombre,
                m.especie,
                m.raza,
                cl.nombre as cliente_nombre,
                cl.telefono as cliente_telefono,
                cl.email as cliente_email,
                u.nombre as veterinario_nombre
            FROM clinical.calendario_citas c
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            LEFT JOIN auth.usuarios u ON c.id_veterinario = u.id_usuario
            WHERE c.id_veterinario = $1
            AND DATE(c.fecha_inicio AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') >= $2::date
            AND DATE(c.fecha_inicio AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') <= $3::date
            AND LOWER(c.estado) NOT IN ('cancelada', 'no_asistio')
            ORDER BY c.fecha_inicio ASC
        `;

        const result = await query(appointmentsQuery, [veterinarioId, fechaInicioISO, fechaFinISO]);
        
        console.log('🔍 DEBUG: Datos de citas individuales recibidos de BD:', 
            result.rows.map(row => ({
                id: row.id_cita,
                fecha_inicio_original: row.fecha_inicio,
                fecha_local_calculada: row.fecha_local,
                fecha_inicio_colombia: row.fecha_inicio_colombia,
                mascota: row.mascota_nombre
            }))
        );
        
        return {
            tipo: 'individual',
            veterinario: result.rows[0]?.veterinario_nombre || 'Veterinario',
            periodo: { inicio: fechaInicio, fin: fechaFin },
            citas: result.rows,
            total_citas: result.rows.length
        };
    }

    /**
     * Obtener agenda consolidada de todos los veterinarios
     */
    async getConsolidatedAgenda(fechaInicio, fechaFin) {
        // Agregar logging para debug de fechas
        console.log('🗓️ Fechas consolidada originales:', { fechaInicio, fechaFin });
        
        // Convertir fechas correctamente con zona horaria de Colombia
        const fechaInicioISO = this.convertToColombianDate(fechaInicio);
        const fechaFinISO = this.convertToColombianDate(fechaFin);
        
        // Construir timestamps completos - MEJOR: usar fechas sin timezone
        // ya que las fechas están almacenadas con timezone UTC pero queremos fecha local
        const fechaInicioCompleta = `${fechaInicioISO} 00:00:00`;
        const fechaFinCompleta = `${fechaFinISO} 23:59:59`;
        
        console.log('🗓️ Fechas consolidada para consulta (Colombia):', { 
            fechaInicioCompleta, 
            fechaFinCompleta,
            fechaInicioISO,
            fechaFinISO 
        });

        const appointmentsQuery = `
            SELECT 
                c.id_cita,
                c.codigo_cita,
                c.fecha_inicio,
                c.fecha_fin,
                DATE(c.fecha_inicio AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') as fecha_local,
                c.fecha_inicio AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota' as fecha_inicio_colombia,
                c.tipo,
                c.motivo,
                c.estado,
                c.notas,
                m.nombre as mascota_nombre,
                m.especie,
                m.raza,
                cl.nombre as cliente_nombre,
                cl.telefono as cliente_telefono,
                cl.email as cliente_email,
                u.nombre as veterinario_nombre,
                c.id_veterinario
            FROM clinical.calendario_citas c
            LEFT JOIN clinical.mascotas m ON c.id_mascota = m.id_mascota
            LEFT JOIN clinical.clientes cl ON m.id_cliente = cl.id_cliente
            LEFT JOIN auth.usuarios u ON c.id_veterinario = u.id_usuario
            WHERE DATE(c.fecha_inicio AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') >= $1::date
            AND DATE(c.fecha_inicio AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') <= $2::date
            AND LOWER(c.estado) NOT IN ('cancelada', 'no_asistio')
            ORDER BY c.fecha_inicio ASC, u.nombre ASC
        `;

        const result = await query(appointmentsQuery, [fechaInicioISO, fechaFinISO]);
        
        console.log('🔍 DEBUG: Datos de citas recibidos de BD:', 
            result.rows.map(row => ({
                id: row.id_cita,
                fecha_inicio_original: row.fecha_inicio,
                fecha_local_calculada: row.fecha_local,
                fecha_inicio_colombia: row.fecha_inicio_colombia,
                mascota: row.mascota_nombre
            }))
        );
        
        // Agrupar por veterinario
        const citasPorVeterinario = result.rows.reduce((acc, cita) => {
            const vetId = cita.id_veterinario;
            if (!acc[vetId]) {
                acc[vetId] = {
                    veterinario: cita.veterinario_nombre,
                    citas: []
                };
            }
            acc[vetId].citas.push(cita);
            return acc;
        }, {});

        return {
            tipo: 'consolidada',
            periodo: { inicio: fechaInicio, fin: fechaFin },
            veterinarios: citasPorVeterinario,
            total_citas: result.rows.length
        };
    }

    /**
     * Generar contenido del PDF - Versión simple y limpia
     */
    async generatePDFContent(doc, agendaData, formato) {
        const pageWidth = doc.page.width;
        const margin = 40;
        let y = 50;
        
        console.log('📄 Generando PDF con datos:', {
            periodo: agendaData.periodo,
            tipo: agendaData.tipo,
            totalCitas: agendaData.total_citas
        });
        
        try {
            // HEADER SIMPLE Y LIMPIO
            doc.fillColor('#000000')
               .fontSize(24)
               .font('Helvetica-Bold')
               .text('VetPlus', margin, y);

            doc.fontSize(14)
               .font('Helvetica')
               .text('Sistema de Gestion Veterinaria', margin, y + 30);

            // Información del período (corregida)
            const fechaInicio = this.formatDateClean(agendaData.periodo.inicio);
            const fechaFin = this.formatDateClean(agendaData.periodo.fin);
            const fechaGeneracion = this.formatDateClean(new Date());
            
            doc.fontSize(12)
               .font('Helvetica')
               .text(`Periodo: ${fechaInicio} - ${fechaFin}`, margin, y + 60);
            
            doc.fontSize(10)
               .text(`Generado: ${fechaGeneracion}`, margin, y + 80);

            // Línea separadora
            doc.strokeColor('#000000')
               .lineWidth(1)
               .moveTo(margin, y + 100)
               .lineTo(pageWidth - margin, y + 100)
               .stroke();

            y += 120;

            // CONTENIDO SEGÚN FORMATO
            if (formato === 'consolidada') {
                await this.renderAgendaConsolidadaSimple(doc, agendaData, margin, y, pageWidth);
            } else {
                await this.renderAgendaIndividualSimple(doc, agendaData, margin, y, pageWidth);
            }

        } catch (error) {
            console.error('❌ Error generando PDF:', error);
            // Generar PDF de error simple
            doc.fillColor('#ff0000')
               .fontSize(14)
               .font('Helvetica')
               .text('Error generando el reporte. Intente nuevamente.', margin, y + 50);
        }
    }

    /**
     * Renderizar agenda consolidada (simple)
     */
    async renderAgendaConsolidadaSimple(doc, agendaData, margin, startY, pageWidth) {
        let currentY = startY;
        
        // Título
        doc.fillColor('#000000')
           .fontSize(16)
           .font('Helvetica-Bold')
           .text(`Agenda Consolidada - Todos los Veterinarios`, margin, currentY);

        doc.fontSize(12)
           .font('Helvetica')
           .text(`Total de citas en el periodo: ${agendaData.total_citas}`, margin, currentY + 25);
           
        currentY += 60;

        // Renderizar cada veterinario
        for (const [vetId, veterinarioData] of Object.entries(agendaData.veterinarios)) {
            if (currentY > 700) { // Nueva página si es necesario
                doc.addPage();
                currentY = 50;
            }
            
            currentY = await this.renderVeterinarioSeccionSimple(doc, veterinarioData, margin, currentY, pageWidth);
        }

        // Footer
        this.renderFooterSimple(doc, pageWidth, agendaData);
    }

    /**
     * Renderizar agenda individual (simple)
     */
    async renderAgendaIndividualSimple(doc, agendaData, margin, startY, pageWidth) {
        let currentY = startY;
        
        // Título
        doc.fillColor('#000000')
           .fontSize(16)
           .font('Helvetica-Bold')
           .text(`Agenda Individual - ${agendaData.veterinario}`, margin, currentY);

        doc.fontSize(12)
           .font('Helvetica')
           .text(`Total de citas: ${agendaData.total_citas}`, margin, currentY + 25);
           
        currentY += 60;

        // Renderizar citas
        for (const cita of agendaData.citas) {
            if (currentY > 700) { // Nueva página si es necesario
                doc.addPage();
                currentY = 50;
            }
            
            currentY = this.renderCitaLimpia(doc, cita, margin, currentY, pageWidth);
        }

        // Footer
        this.renderFooterSimple(doc, pageWidth, agendaData);
    }

    /**
     * Renderizar sección de veterinario (simple)
     */
    async renderVeterinarioSeccionSimple(doc, veterinarioData, margin, startY, pageWidth) {
        let currentY = startY;
        
        // Nombre del veterinario
        doc.fillColor('#000000')
           .fontSize(14)
           .font('Helvetica-Bold')
           .text(`Dr. ${veterinarioData.veterinario}`, margin, currentY);

        doc.fontSize(11)
           .font('Helvetica')
           .text(`${veterinarioData.citas.length} citas programadas`, margin, currentY + 20);
           
        currentY += 45;

        // Renderizar citas del veterinario
        for (const cita of veterinarioData.citas) {
            currentY = this.renderCitaLimpia(doc, cita, margin, currentY, pageWidth);
        }

        return currentY + 20; // Espacio extra entre veterinarios
    }

    /**
     * Renderizar cita de forma limpia y simple
     */
    renderCitaLimpia(doc, cita, margin, startY, pageWidth) {
        let currentY = startY;
        
        // Fecha y hora
        const fecha = this.formatDateClean(cita.fecha_inicio);
        const horaInicio = this.formatTimeClean(cita.fecha_inicio);
        const horaFin = this.formatTimeClean(cita.fecha_fin);
        
        doc.fillColor('#000000')
           .fontSize(11)
           .font('Helvetica-Bold')
           .text(`${fecha} ${horaInicio} - ${horaFin}`, margin + 20, currentY);

        // Estado - texto simple sin caracteres especiales
        const estado = this.getEstadoSimple(cita.estado);
        doc.fontSize(10)
           .font('Helvetica')
           .text(estado, margin + 200, currentY);

        currentY += 20;

        // Información del paciente
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(`Paciente: `, margin + 20, currentY);
        
        doc.font('Helvetica')
           .text(`${cita.mascota_nombre} (${cita.especie} - ${cita.raza})`, margin + 80, currentY);

        currentY += 15;

        // Información del cliente
        doc.font('Helvetica-Bold')
           .text(`Cliente: `, margin + 20, currentY);
        
        doc.font('Helvetica')
           .text(`${cita.cliente_nombre} - Tel: ${cita.cliente_telefono}`, margin + 80, currentY);

        currentY += 15;

        // Tipo de cita
        doc.font('Helvetica-Bold')
           .text(`Tipo: `, margin + 20, currentY);
        
        doc.font('Helvetica')
           .text(`${this.formatTipoSimple(cita.tipo)}`, margin + 60, currentY);

        // Motivo si existe
        if (cita.motivo && cita.motivo.trim()) {
            doc.text(` Motivo: ${cita.motivo}`, margin + 150, currentY);
        }

        return currentY + 30; // Espacio entre citas
    }

    /**
     * Obtener estado simple sin caracteres especiales
     */
    getEstadoSimple(estado) {
        const estados = {
            'pendiente': 'PENDIENTE',
            'confirmada': 'CONFIRMADA',
            'en_progreso': 'EN PROGRESO',
            'completada': 'COMPLETADA',
            'cancelada': 'CANCELADA',
            'no_asistio': 'NO ASISTIO'
        };
        return estados[estado?.toLowerCase()] || 'PENDIENTE';
    }

    /**
     * Formatear tipo simple
     */
    formatTipoSimple(tipo) {
        const tipos = {
            'consulta': 'Consulta',
            'vacunacion': 'Vacunacion',
            'cirugia': 'Cirugia',
            'control': 'Control',
            'emergencia': 'Emergencia',
            'otro': 'Otro'
        };
        return tipos[tipo?.toLowerCase()] || tipo || 'Consulta';
    }

    /**
     * Renderizar footer simple
     */
    renderFooterSimple(doc, pageWidth, agendaData) {
        const margin = 40;
        const footerY = 750;
        
        // Línea separadora
        doc.strokeColor('#000000')
           .lineWidth(1)
           .moveTo(margin, footerY)
           .lineTo(pageWidth - margin, footerY)
           .stroke();

        // Información de la empresa
        doc.fillColor('#000000')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('VetPlus - Sistema de Gestion Veterinaria', margin, footerY + 15);

        doc.fontSize(9)
           .font('Helvetica')
           .text('www.vetplus.com | contacto@vetplus.com | Tel: (555) 123-4567', margin, footerY + 30);

        // Fecha de generación
        const fechaGeneracion = this.formatDateClean(new Date());
        doc.text(`Documento generado automaticamente el ${fechaGeneracion}`, margin, footerY + 45);
    }

    /**
     * Formatear fecha limpia - SIN aplicar timezone adicional
     * Las fechas ya vienen correctas de la base de datos
     */
    formatDateClean(date) {
        console.log('🔍 DEBUG formatDateClean:', {
            input: date,
            inputType: typeof date,
            inputConstructor: date?.constructor?.name
        });

        // Si la fecha es un string con formato YYYY-MM-DD, procesarla directamente
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            const [year, month, day] = date.split('-');
            const formatted = `${day}/${month}/${year}`;
            
            console.log('📅 Formateo directo desde string ISO:', {
                original: date,
                formatted
            });
            
            return formatted;
        }

        const d = new Date(date);
        
        console.log('🔍 DEBUG después de new Date():', {
            date: d.toISOString(),
            getDate: d.getDate(),
            getMonth: d.getMonth() + 1,
            getFullYear: d.getFullYear(),
            getTimezoneOffset: d.getTimezoneOffset()
        });

        // NO aplicar ajustes adicionales de timezone
        // Las fechas de la base de datos ya están en timezone correcto
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        const formatted = `${day}/${month}/${year}`;
        
        console.log('📅 Formateo de fecha (SIN ajuste timezone):', {
            original: date,
            parsedDate: d.toISOString(),
            day, month, year,
            formatted
        });
        
        return formatted;
    }

    /**
     * Formatear hora limpia - SIN aplicar timezone adicional
     * Las horas ya vienen correctas de la base de datos
     */
    formatTimeClean(date) {
        const d = new Date(date);
        
        // NO aplicar ajustes adicionales de timezone
        // Las horas de la base de datos ya están en timezone correcto
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        
        return `${hours}:${minutes}`;
    }

    /**
     * Convertir fecha a formato YYYY-MM-DD considerando zona horaria de Colombia
     */
    convertToColombianDate(dateString) {
        console.log('🌎 Convirtiendo fecha para Colombia:', { dateString });
        
        // Si ya está en formato ISO (YYYY-MM-DD), retornar tal cual
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            console.log('📅 Ya está en formato ISO:', dateString);
            return dateString;
        }
        
        // Si está en formato DD/MM/YYYY (formato colombiano)
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
            const [day, month, year] = dateString.split('/');
            const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            console.log('📅 Convertido de DD/MM/YYYY a ISO:', { original: dateString, iso: isoDate });
            return isoDate;
        }
        
        // Si es una fecha de JavaScript, convertir considerando zona horaria
        if (dateString instanceof Date || !isNaN(Date.parse(dateString))) {
            const date = new Date(dateString);
            
            // Ajustar para zona horaria de Colombia
            const colombianOffset = -5 * 60; // GMT-5 en minutos
            const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
            const colombianTime = new Date(utc + (colombianOffset * 60000));
            
            const year = colombianTime.getFullYear();
            const month = String(colombianTime.getMonth() + 1).padStart(2, '0');
            const day = String(colombianTime.getDate()).padStart(2, '0');
            const isoDate = `${year}-${month}-${day}`;
            
            console.log('📅 Convertido de JS Date a ISO (Colombia):', { 
                original: dateString,
                jsDate: date.toISOString(),
                colombianTime: colombianTime.toISOString(),
                iso: isoDate 
            });
            
            return isoDate;
        }
        
        // Fallback: retornar tal cual
        console.log('⚠️ Fecha no reconocida, usando fallback:', dateString);
        return dateString;
    }

    /**
     * Exportar agenda en formato XLSX
     */
    async exportAgendaXLSX(req, res) {
        try {
            const { 
                veterinario_id, 
                fecha_inicio, 
                fecha_fin, 
                formato = 'individual' 
            } = req.query;

            console.log('📊 Exportando agenda XLSX:', {
                veterinario_id,
                fecha_inicio,
                fecha_fin,
                formato
            });

            // Validar parámetros requeridos
            if (!fecha_inicio || !fecha_fin) {
                return res.status(400).json({
                    success: false,
                    message: 'Fecha de inicio y fin son requeridas'
                });
            }

            // Obtener datos según el formato
            let agendaData;
            if (formato === 'consolidada') {
                agendaData = await this.getConsolidatedAgenda(fecha_inicio, fecha_fin);
            } else {
                if (!veterinario_id) {
                    return res.status(400).json({
                        success: false,
                        message: 'ID del veterinario es requerido para agenda individual'
                    });
                }
                agendaData = await this.getIndividualAgenda(veterinario_id, fecha_inicio, fecha_fin);
            }

            // Crear workbook con ExcelJS
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Agenda');

            // Configurar encabezados
            const headers = [
                'Fecha', 'Hora Inicio', 'Hora Fin', 'Veterinario', 
                'Paciente', 'Cliente', 'Teléfono', 'Tipo', 'Estado', 'Motivo'
            ];
            
            worksheet.addRow(headers);

            // Estilo para encabezados
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE6E6FA' }
            };

            // Agregar datos
            if (formato === 'consolidada') {
                for (const [vetId, veterinarioData] of Object.entries(agendaData.veterinarios)) {
                    for (const cita of veterinarioData.citas) {
                        worksheet.addRow(this.formatXLSXRow(cita));
                    }
                }
            } else {
                for (const cita of agendaData.citas) {
                    worksheet.addRow(this.formatXLSXRow(cita));
                }
            }

            // Configurar anchos de columna
            worksheet.columns = [
                { width: 12 }, // Fecha
                { width: 10 }, // Hora Inicio
                { width: 10 }, // Hora Fin
                { width: 20 }, // Veterinario
                { width: 20 }, // Paciente
                { width: 20 }, // Cliente
                { width: 15 }, // Teléfono
                { width: 15 }, // Tipo
                { width: 12 }, // Estado
                { width: 30 }  // Motivo
            ];

            // Generar buffer
            const buffer = await workbook.xlsx.writeBuffer();

            // Configurar respuesta
            const filename = `agenda_${formato}_${fecha_inicio}_${fecha_fin}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);

        } catch (error) {
            console.error('Error exportando agenda XLSX:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    /**
     * Formatear fila para XLSX
     */
    formatXLSXRow(cita) {
        const fecha = this.formatDateClean(cita.fecha_inicio);
        const horaInicio = this.formatTimeClean(cita.fecha_inicio);
        const horaFin = this.formatTimeClean(cita.fecha_fin);
        
        return [
            fecha,
            horaInicio,
            horaFin,
            cita.veterinario_nombre || '',
            cita.mascota_nombre || '',
            cita.cliente_nombre || '',
            cita.cliente_telefono || '',
            this.formatTipoSimple(cita.tipo),
            this.getEstadoSimple(cita.estado),
            cita.motivo || ''
        ];
    }
}

export default new AppointmentExportController();
