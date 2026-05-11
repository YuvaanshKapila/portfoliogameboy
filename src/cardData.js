/**
 * Data for each "Pokédex card" on the desk. Each card maps to a
 * single artifact from the trainer's (my) real life.
 */

// Encode each path segment so brackets, spaces, smart quotes, etc.
// in the asset filenames survive the browser.
function enc(p) {
  return p.split('/').map(part =>
    part === '' ? '' : encodeURIComponent(part),
  ).join('/');
}

const RAW = [
  {
    id: 'pikachu-plush',
    name: 'Pikachu Plush',
    image: '/images/big pikachu plush/WhatsApp Image 2026-05-10 at 8.19.59 PM.jpeg',
    audio: '/imageaudios/big pikachu plush/[Pokedex]Pikac......oney..mp3',
    text: 'Pikachu Plush Form. Rumoured to contain a tiny hidden soul, it spends its days staring at its Trainer. Scientists believe it does this simply because it cannot move. Obtained after spending way too much money.',
  },
  {
    id: 'pokemon-collection',
    name: 'Pokemon Collection',
    image: '/images/pokemon collection/WhatsApp Image 2026-05-10 at 8.28.34 PM.jpeg',
    audio: '/imageaudios/pokemon collection/[Pokedex]Pikac...... joy..mp3',
    text: 'Pikachu Collection Form. A lively cluster of Pikachu and Raichu plush dwell together, watched over by a curious Mudkip and Hoopa. Their combined energy fills the room with static joy.',
  },
  {
    id: 'dessert',
    name: 'Dessert',
    image: '/images/dessert/WhatsApp Image 2026-05-10 at 8.43.47 PM.jpeg',
    audio: '/imageaudios/dessert/[Pokedex]This ......weet..mp3',
    text: 'This Trainer has a strong weakness for desserts, often rerouting their entire day for something sweet.',
  },
  {
    id: 'cars',
    name: 'Cars',
    image: '/images/cars/WhatsApp Image 2026-05-10 at 8.41.04 PM.jpeg',
    audio: '/imageaudios/cars/[Pokedex]This ......ster..mp3',
    text: 'This Trainer is drawn to cars that look fast, feel fast, and sound even faster.',
  },
  {
    id: 'manga',
    name: 'Manga',
    image: '/images/manga/WhatsApp Image 2026-05-10 at 8.21.28 PM.jpeg',
    audio: '/imageaudios/manga/[Pokedex]“This...... yet..mp3',
    text: 'This Trainer keeps a growing manga collection, but hasn’t gotten JoJo’s yet.',
  },
  {
    id: 'travel',
    name: 'Travel',
    image: '/images/traveling/Screenshot 2026-05-10 203037.png',
    audio: '/imageaudios/travel/[Pokedex]This ......gion..mp3',
    text: 'This Trainer travels to different regions, collecting all types of experiences and memories on his travels. This photo shows the Kalos region.',
  },
  {
    id: 'pc',
    name: 'PC',
    image: '/images/pc/WhatsApp Image 2026-05-10 at 8.22.42 PM.jpeg',
    audio: '/imageaudios/pcsetup/[Pokedex]“This......e it..mp3',
    text: 'This Trainer keeps a setup that’s clean, colorful, and built exactly how they like it.',
  },
  {
    id: 'soccer',
    name: 'Soccer',
    image: '/images/soccer/WhatsApp Image 2026-05-10 at 8.45.06 PM.jpeg',
    audio: '/imageaudios/soccer/[Pokedex]This ......ield..mp3',
    text: 'This Trainer loves to play soccer and never turns down a chance to get on the field.',
  },
];

export const CARDS = RAW.map(c => ({
  ...c,
  image: enc(c.image),
  audio: enc(c.audio),
}));

export function getCardById(id) {
  return CARDS.find(c => c.id === id) || null;
}
