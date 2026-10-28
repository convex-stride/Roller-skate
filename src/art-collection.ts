import starry from './assets/art/starry-night.jpg?url';
import wave from './assets/art/great-wave.jpg?url';
import composition from './assets/art/composition-vii.jpg?url';
import scream from './assets/art/the-scream.jpg?url';
import udnie from './assets/art/udnie.jpg?url';
export const artCollection = [
  { id:'starry-night', title:'The Starry Night (detail)', artist:'Vincent van Gogh', year:'1889', image:starry, aspect:1024/640, file:'starry_night', detail:'A swirling night sky over Saint-Rémy. This reproduction shows a cropped detail of the original painting.' },
  { id:'great-wave', title:'The Great Wave off Kanagawa', artist:'Katsushika Hokusai', year:'c. 1831', image:wave, aspect:928/514, file:'wave', detail:'A woodblock print from Thirty-six Views of Mount Fuji: fishing boats beneath a cresting wave, with Mount Fuji in the distance.' },
  { id:'composition-vii', title:'Composition VII', artist:'Wassily Kandinsky', year:'1913', image:composition, aspect:1071/712, file:'composition_vii', detail:'An abstract composition built from intersecting colour, rhythm and movement.' },
  { id:'the-scream', title:'The Scream', artist:'Edvard Munch', year:'1893', image:scream, aspect:1200/1528, file:'the_scream', detail:'An expressive figure beneath an undulating red sky, painted as part of Munch’s Frieze of Life.' },
  { id:'udnie', title:'Udnie (Young American Girl; The Dance)', artist:'Francis Picabia', year:'1913', image:udnie, aspect:1259/1260, file:'udnie', detail:'An abstract response to dance and motion, built from overlapping curved and angular forms.' },
] as const;
