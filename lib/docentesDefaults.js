// Roster inicial de docentes, pasado por Diego (nombre + curso(s) que dicta + email
// personal de contacto). Se combina con lo que haya cargado en la pestaña "Docentes" del
// Sheet, igual patrón que DOCENTES_CO_DEFAULT en Cronograma ILCE — el Sheet manda si un
// mismo nombre aparece en los dos lados (por si alguien lo edita a mano después).
//
// "cursos" usa los códigos de lib/cursosLogic.js (CO, CE, CEQUI, CDEP, CV, OR, INMOB, COPY).
export const DOCENTES_DEFAULT = [
  { nombre: 'Adrian Saquin', email: 'adriansaquin@gmail.com', cursos: ['CEQUI'] },
  { nombre: 'María Agustina Puricelli', email: 'agustinapuricelli@gmail.com', cursos: ['CO'] },
  { nombre: 'Andrea Andrelucci', email: 'andreaandrelucci@gmail.com', cursos: ['CO'] },
  { nombre: 'Anita Vuono', email: 'anitavuono@gmail.com', cursos: ['CE', 'CO'] },
  { nombre: 'Carolina Graciela Parodi', email: 'caroada17@gmail.com', cursos: ['CEQUI'] },
  { nombre: 'Diego Lerner', email: 'diegolernerdl@gmail.com', cursos: ['CDEP'] },
  { nombre: 'Evelin Gomez', email: 'gomezevelind@gmail.com', cursos: ['CO'] },
  { nombre: 'Gabriela Araceli Cabrera', email: 'gabyaracabrera@gmail.com', cursos: ['CO'] },
  { nombre: 'Gisela Reyes', email: 'gisereyes14@gmail.com', cursos: ['CE'] },
  { nombre: 'Jacqueline D. Fernández', email: 'jackylifecoach@gmail.com', cursos: ['CO'] },
  { nombre: 'Luz Caneda', email: 'kreandovisiones@gmail.com', cursos: ['CO'] },
  { nombre: 'María Guadalupe Romero', email: 'guadaromero.coach@gmail.com', cursos: ['CO'] },
  { nombre: 'María Paula Arigós', email: 'pauarigos@gmail.com', cursos: ['CO'] },
  { nombre: 'Martín Mena', email: 'menamartinnicolas@gmail.com', cursos: ['OR'] },
  { nombre: 'Paula Fernández', email: 'pfernandezfe@gmail.com', cursos: ['CO'] },
  { nombre: 'Sofía Ciuro', email: 'sofiaciuro@gmail.com', cursos: ['INMOB'] },
  { nombre: 'Valeria Martinez', email: 'mvalerialaura@gmail.com', cursos: ['CO', 'CV'] },
  { nombre: 'Valu Tenaglia', email: 'valutenaglia@gmail.com', cursos: ['COPY'] }
];
