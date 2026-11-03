// Country data for Euro Explorer. `id` matches the "name" property in lib/world-data.js.
const REGIONS = {
  north:   { name: "Northern Europe",  emoji: "❄️", color: "#6ec1e4" },
  west:    { name: "Western Europe",   emoji: "🥐", color: "#f4978e" },
  south:   { name: "Southern Europe",  emoji: "🍕", color: "#f9c74f" },
  central: { name: "Central Europe",   emoji: "🏰", color: "#90be6d" },
  balkans: { name: "The Balkans",      emoji: "⛰️", color: "#b392e0" },
  east:    { name: "Eastern Europe",   emoji: "🐻", color: "#f9a15a" },
};

const COUNTRIES = [
  // North
  { id: "Iceland",   name: "Iceland",   cap: "Reykjavik",  region: "north", fact: "Lots of volcanoes and hot springs, and not a single mosquito!" },
  { id: "Norway",    name: "Norway",    cap: "Oslo",       region: "north", fact: "Famous for fjords: deep sea valleys carved out by glaciers." },
  { id: "Sweden",    name: "Sweden",    cap: "Stockholm",  region: "north", fact: "Stockholm is built on 14 islands." },
  { id: "Finland",   name: "Finland",   cap: "Helsinki",   region: "north", fact: "It has more than 180,000 lakes." },
  { id: "Denmark",   name: "Denmark",   cap: "Copenhagen", region: "north", fact: "LEGO bricks were invented here." },
  { id: "Estonia",   name: "Estonia",   cap: "Tallinn",    region: "north", fact: "Skype was created here by Estonian programmers." },
  { id: "Latvia",    name: "Latvia",    cap: "Riga",       region: "north", fact: "More than half of the country is covered in forest." },
  { id: "Lithuania", name: "Lithuania", cap: "Vilnius",    region: "north", fact: "Amber, the \"gold of the Baltic\", washes up on its beaches." },
  // West
  { id: "Ireland",        name: "Ireland",        cap: "Dublin",     region: "west", fact: "Called the Emerald Isle because it is so green." },
  { id: "United Kingdom", name: "United Kingdom", cap: "London",     region: "west", fact: "\"Big Ben\" is really the nickname of the bell inside the clock tower." },
  { id: "France",         name: "France",         cap: "Paris",      region: "west", fact: "The Eiffel Tower gets a fresh coat of paint about every 7 years." },
  { id: "Belgium",        name: "Belgium",        cap: "Brussels",   region: "west", fact: "Famous for chocolate, waffles and fries." },
  { id: "Netherlands",    name: "Netherlands",    cap: "Amsterdam",  region: "west", fact: "About a quarter of the country is below sea level." },
  { id: "Luxembourg",     name: "Luxembourg",     cap: "Luxembourg", region: "west", fact: "One of the smallest countries in Europe." },
  { id: "Monaco",         name: "Monaco",         cap: "Monaco",     region: "west", fact: "The 2nd smallest country in the world, smaller than Central Park in New York." },
  // South
  { id: "Spain",      name: "Spain",      cap: "Madrid",        region: "south", fact: "Home of La Tomatina, a giant tomato-throwing party." },
  { id: "Portugal",   name: "Portugal",   cap: "Lisbon",        region: "south", fact: "It makes about half of all the cork in the world." },
  { id: "Andorra",    name: "Andorra",    cap: "Andorra la Vella", region: "south", fact: "A tiny country in the Pyrenees with the highest capital in Europe." },
  { id: "Italy",      name: "Italy",      cap: "Rome",          region: "south", fact: "Shaped like a boot, and the home of pizza and pasta!" },
  { id: "Malta",      name: "Malta",      cap: "Valletta",      region: "south", fact: "A small island nation in the middle of the Mediterranean Sea." },
  { id: "San Marino", name: "San Marino", cap: "San Marino",    region: "south", fact: "One of the oldest countries in the world, founded in the year 301." },
  { id: "Vatican",    name: "Vatican City", cap: "Vatican City", region: "south", fact: "The smallest country in the world, inside the city of Rome." },
  { id: "Greece",     name: "Greece",     cap: "Athens",        region: "south", fact: "The birthplace of the Olympic Games." },
  { id: "Cyprus",     name: "Cyprus",     cap: "Nicosia",       region: "south", fact: "An island where legend says the goddess Aphrodite was born." },
  // Central
  { id: "Germany",       name: "Germany",       cap: "Berlin",    region: "central", fact: "Has hundreds of different kinds of bread." },
  { id: "Austria",       name: "Austria",       cap: "Vienna",    region: "central", fact: "Mozart was born here, in the city of Salzburg." },
  { id: "Switzerland",   name: "Switzerland",   cap: "Bern",      region: "central", fact: "Famous for chocolate, cheese, watches and the Alps." },
  { id: "Liechtenstein", name: "Liechtenstein", cap: "Vaduz",     region: "central", fact: "Only about 25 km long from top to bottom." },
  { id: "Czechia",       name: "Czechia",       cap: "Prague",    region: "central", fact: "Prague's astronomical clock has been ticking since 1410." },
  { id: "Slovakia",      name: "Slovakia",      cap: "Bratislava", region: "central", fact: "Full of castles, caves and the High Tatra mountains." },
  { id: "Hungary",       name: "Hungary",       cap: "Budapest",  region: "central", fact: "The Rubik's Cube was invented here." },
  { id: "Poland",        name: "Poland",        cap: "Warsaw",    region: "central", fact: "The scientist Marie Curie was born here." },
  { id: "Slovenia",      name: "Slovenia",      cap: "Ljubljana", region: "central", fact: "More than half of the country is forest." },
  // Balkans
  { id: "Croatia",            name: "Croatia",            cap: "Zagreb",   region: "balkans", fact: "Has over 1,000 islands along its coast." },
  { id: "Bosnia and Herz.",   name: "Bosnia and Herzegovina", cap: "Sarajevo", region: "balkans", fact: "Sarajevo hosted the Winter Olympics in 1984." },
  { id: "Serbia",             name: "Serbia",             cap: "Belgrade", region: "balkans", fact: "Belgrade is where the rivers Sava and Danube meet." },
  { id: "Montenegro",         name: "Montenegro",         cap: "Podgorica", region: "balkans", fact: "Its name means \"Black Mountain\"." },
  { id: "Kosovo",             name: "Kosovo",             cap: "Pristina", region: "balkans", fact: "One of the youngest countries in Europe, since 2008." },
  { id: "Macedonia",          name: "North Macedonia",    cap: "Skopje",   region: "balkans", fact: "Home to Lake Ohrid, one of the oldest lakes in Europe." },
  { id: "Albania",            name: "Albania",            cap: "Tirana",   region: "balkans", fact: "Locals call it \"Land of the Eagles\"." },
  { id: "Bulgaria",           name: "Bulgaria",           cap: "Sofia",    region: "balkans", fact: "Yoghurt bacteria are named after it: Lactobacillus bulgaricus." },
  { id: "Romania",            name: "Romania",            cap: "Bucharest", region: "balkans", fact: "Transylvania, the home of the Dracula legend, is here." },
  // East
  { id: "Russia",  name: "Russia",  cap: "Moscow",   region: "east", fact: "The biggest country in the world, with 11 time zones!" },
  { id: "Ukraine", name: "Ukraine", cap: "Kyiv",     region: "east", fact: "The biggest country that lies completely inside Europe." },
  { id: "Belarus", name: "Belarus", cap: "Minsk",    region: "east", fact: "Home to wild European bison in ancient forests." },
  { id: "Moldova", name: "Moldova", cap: "Chisinau", region: "east", fact: "Has one of the biggest wine cellars in the world." },
];

// Tiny countries get a clickable ring so they are easy to hit.
const MICROSTATES = ["Andorra", "Liechtenstein", "Luxembourg", "Malta", "San Marino", "Vatican", "Monaco"];

// Dataset features that belong to a game country under another id.
const ALIASES = { "N. Cyprus": "Cyprus" };
