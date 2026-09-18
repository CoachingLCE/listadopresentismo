// Roster inicial de docentes, pasado por Diego (nombre + curso(s) que dicta + email
// personal de contacto). Se combina con lo que haya cargado en la pestaña "Docentes" del
// Sheet, igual patrón que DOCENTES_CO_DEFAULT en Cronograma ILCE — el Sheet manda si un
// mismo nombre aparece en los dos lados (por si alguien lo edita a mano después).
//
// "cursos" usa los códigos de lib/cursosLogic.js (CO, CE, CEQUI, CDEP, CV, OR, INMOB, COPY).
//
// "roles" distingue si la persona puede asignarse como Docente de una edición, como Staff
// (apoyo/logística) o ambas cosas. Este roster era originalmente solo de docentes, por eso
// todos arrancan en ['Docente'] — se puede sumar 'Staff' desde Docentes y Staff sin perder
// los cursos ya cargados.
export const DOCENTES_DEFAULT = [
  { nombre: 'Adrian Saquin', email: 'adriansaquin@gmail.com', cursos: ['CEQUI'], roles: ['Docente'] },
  { nombre: 'María Agustina Puricelli', email: 'agustinapuricelli@gmail.com', cursos: ['CO'], roles: ['Docente'] },
  { nombre: 'Andrea Andrelucci', email: 'andreaandrelucci@gmail.com', cursos: ['CO'], roles: ['Docente'] },
  { nombre: 'Anita Vuono', email: 'anitavuono@gmail.com', cursos: ['CE', 'CO'], roles: ['Docente'] },
  { nombre: 'Carolina Graciela Parodi', email: 'caroada17@gmail.com', cursos: ['CEQUI'], roles: ['Docente'] },
  { nombre: 'Diego Lerner', email: 'diegolernerdl@gmail.com', cursos: ['CDEP'], roles: ['Docente'] },
  { nombre: 'Evelin Gomez', email: 'gomezevelind@gmail.com', cursos: ['CO'], roles: ['Docente'] },
  { nombre: 'Gabriela Araceli Cabrera', email: 'gabyaracabrera@gmail.com', cursos: ['CO'], roles: ['Docente'] },
  { nombre: 'Gisela Reyes', email: 'gisereyes14@gmail.com', cursos: ['CE'], roles: ['Docente'] },
  { nombre: 'Jacqueline D. Fernández', email: 'jackylifecoach@gmail.com', cursos: ['CO'], roles: ['Docente'] },
  { nombre: 'Luz Caneda', email: 'kreandovisiones@gmail.com', cursos: ['CO'], roles: ['Docente'] },
  { nombre: 'María Guadalupe Romero', email: 'guadaromero.coach@gmail.com', cursos: ['CO'], roles: ['Docente'] },
  { nombre: 'María Paula Arigós', email: 'pauarigos@gmail.com', cursos: ['CO'], roles: ['Docente'] },
  { nombre: 'Martín Mena', email: 'menamartinnicolas@gmail.com', cursos: ['OR'], roles: ['Docente'] },
  { nombre: 'Paula Fernández', email: 'pfernandezfe@gmail.com', cursos: ['CO'], roles: ['Docente'] },
  { nombre: 'Sofía Ciuro', email: 'sofiaciuro@gmail.com', cursos: ['INMOB'], roles: ['Docente'] },
  { nombre: 'Valeria Martinez', email: 'mvalerialaura@gmail.com', cursos: ['CO', 'CV'], roles: ['Docente'] },
  { nombre: 'Valu Tenaglia', email: 'valutenaglia@gmail.com', cursos: ['COPY'], roles: ['Docente'] }
];
