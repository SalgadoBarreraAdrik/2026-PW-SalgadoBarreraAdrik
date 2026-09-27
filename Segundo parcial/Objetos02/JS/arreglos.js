const talleres = [
  { nombre: 'Introducción a Python', instructor: 'Ing. María López', cupo: 25, inscritos: 25 },
  { nombre: 'Fundamentos de Redes', instructor: 'Ing. Carlos Ramírez', cupo: 30, inscritos: 18 },
  { nombre: 'Diseño de Bases de Datos', instructor: 'Ing. Ana Torres', cupo: 20, inscritos: 20 },
  { nombre: 'Desarrollo Web con JS', instructor: 'Ing. María López', cupo: 25, inscritos: 10 },
];
 
// TODO: forEach — imprime "- <nombre> (<inscritos>/<cupo>)" de cada taller
console.log("Aplicando un forEach para imprimir los talleres:");
talleres.forEach((t) => console.log(`- ${t.nombre} (${t.inscritos}/${t.cupo})`));
 
// TODO: map — crea un arreglo `nombres` solo con los nombres de los talleres
console.log("Aplicando funcion Map con solo Nombres")
const nombres = talleres.map((t) => t.nombre);
console.log(nombres);
 
// TODO: filter — crea un arreglo `llenos` con los talleres donde inscritos >= cupo
 
console.log("Aplicando la función Filter en los talleres")
const llenos = talleres.filter((t) => t.inscritos >= t.cupo);
console.log(llenos.map((t)=> t.nombre))
 
 
// TODO: find — encuentra el PRIMER taller impartido por 'Ing. María López'
 
console.log("Aplicando la función Find para buscar por instructor")
const tallerDeMaria = talleres.find((t) => t.instructor === 'Ing. María López');
console.log(tallerDeMaria);
 
// TODO: reduce — calcula `totalInscritos`, la suma de inscritos de todos los talleres
 
console.log("Aplicando la función Reduce para sumar los inscritos")
const totalInscritos = talleres.reduce((acumulado, t) => acumulado + t.inscritos, 0);
console.log(totalInscritos);
 
// TODO: filter + map encadenados — nombres de los talleres que SÍ tienen cupo disponible
 
console.log("Aplicando Filter + Map encadenados para los talleres con cupo disponible")
const conCupoDisponible = talleres.filter((t) => t.inscritos < t.cupo).map((t) => t.nombre);
console.log(conCupoDisponible);
// TODO: Object.keys — imprime solo los nombres de las propiedades de `taller`
console.log(`manejo de keys`);
console.log(Object.keys(taller));

// TODO: Object.values — imprime solo los valores
console.log(`Manejo de los valores`);
console.log(Object.values(taller));

// TODO: Object.entries — recorre con for..of e imprime "campo: valor" de cada propiedad
console.log(`Manejo de propiedades de un objeto`);
for(const [campo, valor] of Object.entries(taller)){
  console.log(`${campo} : ${valor}`)
}

// TODO: JSON.stringify — convierte `taller` a texto (guárdalo en `textoJson`) e imprímelo
console.log(`Transformacion de json a cadena`);
const textoJson = JSON.stringify(taller, null, 2);
console.log(`tipo :`, typeof textoJson);

// TODO: JSON.parse — convierte `textoJson` de vuelta a objeto (guárdalo en `objetoDeVuelta`)
//       e imprime `objetoDeVuelta.nombre`
console.log(`Regreso del objeto`);
const objetoDeVuelta = JSON.parse(textoJson);
console.log(`tipo :`, typeof objetoDeVuelta);
console.log(objetoDeVuelta.nombre);