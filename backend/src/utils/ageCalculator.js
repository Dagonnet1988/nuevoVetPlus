// ✅ CALCULADORA DE EDAD VETERINARIA - OPCIÓN 3
export const calculatePetAge = (fechaNacimiento) => {
    if (!fechaNacimiento) return null;

    const fechaNac = new Date(fechaNacimiento);
    const hoy = new Date();
    
    // Calcular diferencia en meses
    let meses = (hoy.getFullYear() - fechaNac.getFullYear()) * 12;
    meses -= fechaNac.getMonth();
    meses += hoy.getMonth();
    
    // Ajustar si el día actual es menor al día de nacimiento
    if (hoy.getDate() < fechaNac.getDate()) {
        meses--;
    }

    // Convertir a años y meses
    const años = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;

    // Formatear texto descriptivo
    let edadTexto = "";
    if (años === 0) {
        edadTexto = mesesRestantes === 1 ? "1 mes" : `${mesesRestantes} meses`;
    } else if (años === 1) {
        if (mesesRestantes === 0) {
            edadTexto = "1 año";
        } else if (mesesRestantes === 1) {
            edadTexto = "1 año 1 mes";
        } else {
            edadTexto = `1 año ${mesesRestantes} meses`;
        }
    } else {
        if (mesesRestantes === 0) {
            edadTexto = `${años} años`;
        } else if (mesesRestantes === 1) {
            edadTexto = `${años} años 1 mes`;
        } else {
            edadTexto = `${años} años ${mesesRestantes} meses`;
        }
    }

    // OPCIÓN 3: Objeto completo con toda la información
    return {
        años,
        meses: mesesRestantes,
        totalMeses: meses,
        edadTexto,
        esJoven: meses < 12, // Menor a 1 año
        esCachorro: meses < 6, // Menor a 6 meses
        esAdultoMayor: años >= 7 // Mayor o igual a 7 años (varía por especie)
    };
};
