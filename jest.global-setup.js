// Los tests de fechas corren en una zona con horario de verano.
// America/Santiago es el peor caso: el reloj salta justo a medianoche.
// Para probar otras zonas: `npm run test:tz`.
module.exports = () => {
  process.env.TZ = process.env.TEST_TZ || 'America/Santiago';
};
