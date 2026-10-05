/*
 * story.js — ALL of the game's words, people and places live here.
 * Edit this file to change dialogue; no other code needs to change.
 *
 * Script steps (used in `intro`, `spots[].script`, `sceneDone`, `outro`):
 *   ['who', 'Text', 'expr?']     a line of dialogue. who = a CAST id, 'you', or 'narr' (narration)
 *                                 {name} in the text becomes the player's name.
 *   { name: true }                ask for the player's name ("Name for the table?")
 *   { order: { who, options:[dish ids], prompt? } }   show the food and let the player pick one
 *   { tea: { who } }              pick a tea; the cup on your table changes color
 *   { tap: true }                 "tap two fingers on the table" (the tea thank-you)
 *   { dish: 'id' }                put a dish on your table
 *   { swap: ['fromId','toId'] }   a character ages in a flash (same spot on screen)
 *   { enter: 'id' } / { leave: 'id' }   a character walks in / out
 *   { caption: 'Text' }           big centered caption ("Four years later…")
 *   { scene: 'key' }              switch to another scene of this stop (room ↔ street)
 *   { zoom: [scale, x, y] }       zoom the street view toward a point (walking)
 *   { button: 'Label' }           wait for the player to press a button
 *   { sfx: 'name' } { music: 'track' } { wait: ms }
 *
 * Sources for every fact are listed in SOURCES below and in docs/SOURCES.md.
 */
(function (root) {
  'use strict';

  var SKIN = { a: '#f3d3b5', b: '#ecc39d', c: '#e2b48b', d: '#c68a63', e: '#8d5a3b', f: '#5e3b26' };
  var HAIR = { black: '#1d1a1a', dark: '#33261f', gray: '#8e8a86', white: '#dcd8d1', brown: '#5a3a2a', blond: '#d6b46a', salt: '#4a4440' };

  // ---------------------------------------------------------------- people
  // name = name tag; voice = text blip; look = drawing recipe (see js/art/people.js)
  var CAST = {
    waiter: { name: 'Waiter', voice: 'mid', look: {
      build: 'm', skin: SKIN.c, hair: { style: 'slick', color: HAIR.black },
      outfit: { color: '#f4f1ea', collar: 'shirt', tie: '#2a2a2a', layer: 'vest', layerColor: '#2b2b30' }, prop: 'teapot' } },

    may: { name: 'May Choy', voice: 'high', look: {
      build: 'f', skin: SKIN.b, hair: { style: 'waves', color: HAIR.black }, lip: '#b8323a', earrings: '#e9c35a',
      outfit: { color: '#2f6b5a', collar: 'mandarin', frogs: true, trim: '#e2b85a' }, prop: 'notepad' } },

    ed: { name: 'Ed Choy', voice: 'low', look: {
      build: 'm', skin: SKIN.c, hair: { style: 'slick', color: HAIR.black }, hat: 'paper', mustache: '#1d1a1a',
      outfit: { color: '#f6f3ec', collar: 'round', layer: 'apron', layerColor: '#fdfcf8' }, prop: 'tray' } },

    lee: { name: 'Mr. Lee', voice: 'low', look: {
      build: 'm', skin: SKIN.c, hair: { style: 'slick', color: HAIR.salt },
      outfit: { color: '#f2eee4', collar: 'shirt', tie: '#7a2f2a', layer: 'jacket', layerColor: '#4a3c30' }, prop: 'cup' } },

    auntie50: { name: 'Dim Sum Lady', voice: 'high', look: {
      build: 'f', skin: SKIN.c, hair: { style: 'bun', color: HAIR.black },
      outfit: { color: '#e9e2d0', collar: 'mandarin', trim: '#9a8f7a', layer: 'apron', layerColor: '#fdfcf8' }, prop: 'tray' } },

    wally50: { name: 'Wally', voice: 'mid', look: {
      build: 'teen', skin: SKIN.c, hair: { style: 'tousled', color: HAIR.black }, hat: 'paper',
      outfit: { color: '#d9e3e8', collar: 'shirt', layer: 'apron', layerColor: '#fdfcf8', towel: true }, prop: 'tub' } },

    wally54: { name: 'Wally', voice: 'mid', look: {
      build: 'm', skin: SKIN.c, hair: { style: 'slick', color: HAIR.black },
      outfit: { color: '#f6f3ec', collar: 'shirt', tie: '#2a3f6a', layer: 'vest', layerColor: '#3a3a40' } } },

    wally74: { name: 'Wally Tang', voice: 'mid', look: {
      build: 'm', skin: SKIN.c, hair: { style: 'slick', color: '#2a2422' }, glasses: 'square',
      outfit: { color: '#bcd3e0', collar: 'shirt', placket: true, pocket: true, pen: true } } },

    kid: { name: 'Kid', voice: 'kid', look: {
      build: 'kid', skin: SKIN.c, hair: { style: 'bowl', color: HAIR.black },
      outfit: { color: '#e94f37', collar: 'round', stripes: '#f6f1e3' } } },

    discoA: { name: 'Regular', voice: 'high', look: {
      build: 'f', skin: SKIN.d, hair: { style: 'feathered', color: HAIR.brown }, earrings: '#e9c35a',
      outfit: { color: '#d9792b', collar: 'turtle' } } },

    discoB: { name: 'Regular', voice: 'low', look: {
      build: 'm', skin: SKIN.f, hair: { style: 'afro', color: HAIR.black }, mustache: '#1d1a1a',
      outfit: { color: '#5a3a8a', collar: 'open', collarColor: '#f2d37a' } } },

    cart70: { name: 'Dim Sum Lady', voice: 'high', look: {
      build: 'f', skin: SKIN.c, hair: { style: 'bun', color: HAIR.black }, lip: '#a8323a',
      outfit: { color: '#8a2f3a', collar: 'mandarin', frogs: true, trim: '#e2b85a', nametag: true } } },

    cart90: { name: 'Dim Sum Lady', voice: 'high', look: {
      build: 'f', skin: SKIN.c, hair: { style: 'bob', color: HAIR.salt }, glasses: 'round',
      outfit: { color: '#f4f1ea', collar: 'shirt', layer: 'vest', layerColor: '#2f7f7a', nametag: true } } },

    wally96: { name: 'Wally Tang', voice: 'old', look: {
      build: 'm', age: 'old', skin: SKIN.c, hair: { style: 'balding', color: HAIR.gray }, glasses: 'square',
      outfit: { color: '#f0ece2', collar: 'shirt', layer: 'cardigan', layerColor: '#7a6a4a' }, prop: 'cards' } },

    pal96: { name: 'Card Player', voice: 'old', look: {
      build: 'm', age: 'old', skin: SKIN.b, hair: { style: 'buzz', color: HAIR.white },
      outfit: { color: '#5a6a5a', collar: 'polo' }, prop: 'cup' } },

    crew90: { name: 'Film Crew', voice: 'low', look: {
      build: 'm', skin: SKIN.a, hair: { style: 'buzz', color: HAIR.brown }, hat: 'cap', hatColor: '#1d1d1d', stubble: '#5a3a2a',
      outfit: { color: '#2a2a2a', collar: 'round', layer: 'vest', layerColor: '#6a6a4a', lanyard: '#e94f37' } } },

    wilson10: { name: 'Wilson Tang', voice: 'mid', look: {
      build: 'm', skin: SKIN.c, hair: { style: 'modern', color: HAIR.black },
      outfit: { color: '#a9c6e6', collar: 'shirt', placket: true }, prop: 'tablet' } },

    wally10: { name: 'Uncle Wally', voice: 'old', look: {
      build: 'm', age: 'old', skin: SKIN.c, hair: { style: 'balding', color: HAIR.white }, glasses: 'square',
      outfit: { color: '#f0ece2', collar: 'shirt', layer: 'cardigan', layerColor: '#5a6a7a' }, prop: 'cup' } },

    wilson20: { name: 'Wilson Tang', voice: 'mid', look: {
      build: 'm', skin: SKIN.c, hair: { style: 'modern', color: HAIR.black },
      outfit: { color: '#232326', collar: 'round', layer: 'jacket', layerColor: '#3a4a5a' } } },

    insta20: { name: 'Customer', voice: 'high', look: {
      build: 'f', skin: SKIN.b, hair: { style: 'long', color: HAIR.dark }, hat: 'beanie', hatColor: '#c94f6f',
      outfit: { color: '#e9a23b', layer: 'puffer', layerColor: '#e9a23b' }, prop: 'phone' } },

    server26: { name: 'Server', voice: 'high', look: {
      build: 'f', skin: SKIN.d, hair: { style: 'ponytail', color: HAIR.black },
      outfit: { color: '#1f1f22', collar: 'round', layer: 'apron', layerColor: '#b8312b', nametag: true }, prop: 'teapot' } },

    nj1: { name: 'Customer', voice: 'low', look: {
      build: 'm', skin: SKIN.e, hair: { style: 'buzz', color: HAIR.black },
      outfit: { color: '#2e5a8a', collar: 'hood' } } },

    nj2: { name: 'Customer', voice: 'high', look: {
      build: 'f', skin: SKIN.a, hair: { style: 'long', color: HAIR.blond },
      outfit: { color: '#e94f6f', collar: 'vneck' }, prop: 'phone' } },

    guide26: { name: 'Tour Guide', voice: 'mid', look: {
      build: 'm', skin: SKIN.b, hair: { style: 'modern', color: HAIR.gray }, glasses: 'round',
      outfit: { color: '#2f7f6a', collar: 'polo', lanyard: '#f2c23b' }, prop: 'flag' } }
  };

  // ---------------------------------------------------------------- food & tea
  var DISHES = {
    almond_cookie: { en: 'Almond cookie', zh: '杏仁餅', desc: 'Crumbly, buttery, with an almond pressed in the middle. A Nom Wah classic since the bakery days.' },
    mooncake: { en: 'Mooncake', zh: '月餅', desc: 'Filled with lotus seed or red bean paste, for the Mid-Autumn Festival.' },
    cha_siu_bao: { en: 'Cha siu bao', zh: '叉燒包', desc: 'Fluffy steamed buns filled with sweet roast pork.' },
    har_gow: { en: 'Har gow', zh: '蝦餃', desc: 'Shrimp dumplings in a thin, see-through wrapper.' },
    siu_mai: { en: 'Siu mai', zh: '燒賣', desc: 'Open-topped pork and shrimp dumplings.' },
    turnip_cake: { en: 'Turnip cake', zh: '蘿蔔糕', desc: 'Pan-fried cakes of shredded radish, crispy outside and soft inside.' },
    cheung_fun: { en: 'Rice noodle roll', zh: '腸粉', desc: 'Silky rice sheets rolled around shrimp, with sweet soy sauce.' },
    egg_roll: { en: 'The "Original" Egg Roll', zh: '', desc: 'Nom Wah\'s signature: wrapped in a thin egg crepe and fried golden.' },
    snow_pea_dumplings: { en: 'Shrimp & snow pea leaf dumplings', zh: '豆苗蝦餃', desc: 'Shrimp and bright green pea shoots in a delicate wrapper.' },
    noodles: { en: 'Pan-fried noodles', zh: '煎麵', desc: 'Crispy golden noodles with vegetables and savory sauce.' }
  };

  var TEAS = {
    bolei: { en: 'Bo lei (pu-erh)', zh: '普洱', color: '#4a2410',
      line: 'Bo lei — that\'s Cantonese for pu-erh. Aged tea from Yunnan, dark and earthy. It\'s the classic tea for dim sum.' },
    jasmine: { en: 'Jasmine', zh: '香片', color: '#c9b46a',
      line: 'Jasmine — green tea scented with jasmine blossoms. Light and fragrant.' },
    oolong: { en: 'Oolong', zh: '烏龍', color: '#a8642a',
      line: 'Oolong — somewhere between green tea and black tea. The old regulars here have always loved it.' },
    chrysanthemum: { en: 'Chrysanthemum', zh: '菊花', color: '#e0bf4a',
      line: 'Chrysanthemum — not tea leaves at all, but dried flowers. Smooth and a little sweet.' }
  };

  // ---------------------------------------------------------------- the visit, era by era
  // Positions are in scene units (1600×900). Near people stand by your table (y≈935);
  // seated patrons sit in the booths on the right (y≈560, smaller).
  var STOPS = [
    // ------------------------------------------------------------ 1920
    {
      id: 's1920', label: '1920', title: 'Walk down Doyers Street', grade: 'e1920', music: 'e1920',
      scenes: {
        street: { kind: 'street', era: '1920' },
        room: { kind: 'room', room: 'e1920', actors: [{ id: 'waiter', x: 1010, y: 905, s: 1 }] }
      },
      start: 'street',
      prompt: 'Click the glowing door to go inside.',
      intro: [
        ['narr', 'New York City, 1920. You turn the corner onto Doyers Street, in Chinatown — right next to the Lower East Side.'],
        { button: 'Walk down the street' },
        { sfx: 'step' }, { zoom: [1.25, 800, 470] }, { sfx: 'step' },
        ['narr', 'It\'s a short, crooked block with a sharp bend in the middle. Newspapers nicknamed the bend the "Bloody Angle" — back in the tong wars, its blind corner was a spot for ambushes.'],
        ['narr', 'A few doors down, this street was once home to New York\'s first Chinese-language theater.'],
        { button: 'Keep walking' },
        { sfx: 'step' }, { zoom: [1.5, 800, 470] }, { sfx: 'step' },
        ['narr', 'Right in the crook of the bend, the air smells like butter and toasted almonds. A bakery and tea parlor has opened here: Nom Wah.']
      ],
      spots: [
        { id: 'door', scene: 'street', label: 'Nom Wah\'s door', at: [831, 470], area: [800, 410, 64, 150], required: true, script: [
          { sfx: 'door_bell' }, { scene: 'room' },
          ['waiter', 'Good afternoon! Just one? Right this way.'],
          ['narr', 'He seats you at a little table by the front window and pours you a cup of hot tea.'],
          { sfx: 'pour' },
          ['waiter', 'Almond cookies are coming out of the oven soon. Enjoy!', 'happy'],
          ['narr', 'You take a sip. The steam swirls up around you...']
        ] },
        { id: 'car', scene: 'street', label: 'Model T', at: [330, 640], area: [190, 600, 290, 170], script: [
          ['narr', 'A Ford Model T is parked at the curb. In 1920, about half the cars in America are Model Ts.']
        ] },
        { id: 'people', scene: 'street', label: 'People on the street', at: [1020, 480], area: [950, 490, 140, 170], script: [
          ['narr', 'Almost everyone out here is a man in a suit and hat. Under the Chinese Exclusion Act of 1882, very few Chinese women are allowed into the country.']
        ] },
      ],
      next: 'Meet the host'
    },

    // ------------------------------------------------------------ 1930s
    {
      id: 's1930', label: '1930s', title: 'Meet the host', grade: 'e1930', music: 'e1930',
      scenes: {
        room: { kind: 'room', room: 'e1930', actors: [{ id: 'ed', x: 560, y: 905, s: 0.96 }, { id: 'may', x: 1030, y: 905, s: 1 }] }
      },
      start: 'room',
      prompt: 'Talk to May — click anyone (or anything) that glows.',
      intro: [
        ['narr', 'The steam clears. Same table, same window... but the calendar on the wall now says 1935.'],
        ['may', 'Welcome to Nom Wah! I\'m May Choy. My husband Ed and I run this place.', 'happy'],
        ['may', 'What name should I put down for your table?'],
        { name: true },
        ['may', '{name}! Lovely to meet you. Make yourself at home.', 'happy']
      ],
      spots: [
        { id: 'may', actor: 'may', label: 'May Choy', required: true, script: [
          ['you', 'So what kind of place is this?'],
          ['may', 'A bakery first! We bake right here at 15 Doyers Street, and we pour tea next door at Number 13.'],
          ['may', 'Everyone comes for our almond cookies and our mooncakes — lotus seed or red bean.'],
          ['may', 'People come from all over. Our Chinatown neighbors, and folks from all around the city.'],
          ['may', 'Here — an almond cookie for you. On the house!', 'happy'],
          { dish: 'almond_cookie' }
        ] },
        { id: 'ed', actor: 'ed', label: 'Ed Choy', script: [
          ['ed', 'Careful, these are fresh out of the oven!'],
          ['ed', 'At the Mid-Autumn Festival, the line for our mooncakes goes right out the door and down the block.', 'happy']
        ] },
        { id: 'radio', label: 'Radio', at: [980, 250], area: [915, 250, 130, 145], script: [
          ['narr', '♪ A wooden "cathedral" radio on the counter crackles out a swing tune.']
        ] },
        { id: 'phone', label: 'Telephone', at: [770, 262], area: [730, 255, 90, 140], script: [
          ['narr', 'A candlestick telephone. To make a call, you lift the earpiece and ask the operator for a number.']
        ] },
        { id: 'window', label: 'Window', at: [220, 430], area: [58, 300, 324, 257], script: [
          ['narr', 'A dark green sedan with rounded fenders rumbles past the window.']
        ] }
      ],
      next: 'Sit back and look around'
    },

    // ------------------------------------------------------------ 1940s
    {
      id: 's1940', label: '1940s', title: 'Look around', grade: 'e1940', music: 'e1940',
      scenes: {
        room: { kind: 'room', room: 'e1940', actors: [{ id: 'lee', x: 1330, y: 560, s: 0.5 }] }
      },
      start: 'room',
      prompt: 'Look around — click anything that glows.',
      intro: [
        ['narr', 'You sit back and look around. The calendar says 1943, and big band swing is playing on the radio.']
      ],
      spots: [
        { id: 'counter', label: 'Bakery case', at: [700, 430], area: [520, 404, 380, 82], required: true, script: [
          ['narr', 'The glass counter is packed with mooncakes and almond cookies. All through the 1940s, \'50s and \'60s, most of Nom Wah\'s business comes from the bakery.']
        ] },
        { id: 'radio', label: 'Radio', at: [980, 270], area: [905, 296, 150, 100], required: true, script: [
          { sfx: 'page' },
          ['narr', '♪ The music cuts out for a news bulletin...'],
          ['narr', 'Congress has repealed the Chinese Exclusion Act — the 1882 law that kept most Chinese immigrants out of the country.'],
          ['narr', 'The new rules allow only about 105 Chinese immigrants a year. But the door is finally open a crack.']
        ] },
        { id: 'lee', actor: 'lee', label: 'Mr. Lee', required: true, script: [
          ['lee', 'Did you hear the radio? Maybe now my wife and son can finally come over from China.'],
          ['lee', 'I\'ve lived here on my own for years. So have most of the men on this street.', 'worried'],
          ['lee', 'That\'s why I come every afternoon. A pot of tea, a bun, some friends... it\'s the closest thing I have to a family table.']
        ] },
        { id: 'window', label: 'Window', at: [220, 430], area: [58, 300, 324, 257], script: [
          ['narr', 'A shiny maroon sedan rolls by. Out on the Bowery, streetcars still clang along the tracks.']
        ] },
        { id: 'calendar', label: 'Calendar', at: [478, 300], area: [430, 300, 96, 120], script: [
          ['narr', 'December 1943. The United States and China are allies in World War II.']
        ] }
      ],
      next: 'Flag down the dim sum lady'
    },

    // ------------------------------------------------------------ 1950s–60s
    {
      id: 's1950', label: '1950s–60s', title: 'The dim sum lady comes around', grade: 'e1950', music: 'e1950',
      scenes: {
        room: { kind: 'room', room: 'e1950', actors: [{ id: 'wally50', x: 540, y: 905, s: 1 }, { id: 'auntie50', x: 1050, y: 905, s: 1 }] }
      },
      start: 'room',
      prompt: 'Talk to the dim sum lady and the busboy.',
      intro: [
        ['narr', '1950. A dim sum lady is heading your way with a tray — and a young busboy is clearing the table next to yours.']
      ],
      spots: [
        { id: 'auntie', actor: 'auntie50', label: 'Dim sum lady', required: true, script: [
          ['auntie50', 'Dim sum! Fresh from the steamer!', 'happy'],
          ['auntie50', 'Here, dim sum is a little treat to go with your tea. We serve it at breakfast and lunch.'],
          { order: { who: 'auntie50', options: ['cha_siu_bao', 'har_gow'] } },
          ['auntie50', 'The bakery is still our pride and joy, though. Save room for a mooncake!']
        ] },
        { id: 'wally', actor: 'wally50', label: 'Busboy', required: true, script: [
          ['wally50', 'Oh — sorry! Let me get these plates out of your way.', 'surprised'],
          ['wally50', 'I\'m Wally. I just came over from China this year. I\'m sixteen.'],
          ['you', 'Sixteen? And you\'re already working?'],
          ['wally50', 'Started the day I arrived. Washing dishes, busing tables — whatever they need.'],
          ['wally50', 'I don\'t talk much. I just work hard.', 'serious'],
          { caption: 'Four years later…' },
          { swap: ['wally50', 'wally54'] },
          ['wally54', 'Remember me? I\'m twenty now... and I\'m the manager of Nom Wah!', 'proud']
        ] },
        { id: 'window', label: 'Window', at: [220, 430], area: [58, 300, 324, 257], script: [
          ['narr', 'A two-tone car with big chrome tail fins cruises by. And the old elevated train at the end of the block? It shut down in 1955.']
        ] },
        { id: 'radio', label: 'Radio', at: [980, 270], area: [900, 300, 160, 92], script: [
          ['narr', '♪ Doo-wop is playing on a pastel radio. Very 1950s.']
        ] }
      ],
      next: 'Talk to the other patrons'
    },

    // ------------------------------------------------------------ 1970s–80s
    {
      id: 's1970', label: '1970s–80s', title: 'Talk to the other patrons', grade: 'e1970', music: 'e1970',
      scenes: {
        room: { kind: 'room', room: 'e1970', actors: [
          { id: 'discoA', x: 1250, y: 560, s: 0.5 }, { id: 'discoB', x: 1452, y: 560, s: 0.5 },
          { id: 'kid', x: 790, y: 560, s: 0.62 },
          { id: 'wally74', x: 1010, y: 905, s: 1 }
        ] }
      },
      start: 'room',
      prompt: 'Talk to the other patrons.',
      intro: [
        ['narr', 'Whoa — the room changed! In 1968, Nom Wah lost its lease and moved one door down, to 13 Doyers Street.', 'surprised'],
        ['narr', 'It\'s the 1980s now. Red vinyl booths, a tin ceiling, swivel stools — and every seat is taken.']
      ],
      spots: [
        { id: 'wally', actor: 'wally74', label: 'Wally', required: true, script: [
          ['wally74', 'Welcome! Hmm... you look just like somebody I served back when I was a busboy.'],
          ['wally74', 'Back in 1974, the Choys sold Nom Wah to me. Dishwasher, manager... owner.', 'proud'],
          ['wally74', 'Now we do real dim sum — har gow, siu mai, all of it — on carts.'],
          ['wally74', 'My rule? If it\'s not broken, don\'t fix it.', 'serious']
        ] },
        { id: 'couple', actor: 'discoA', alsoActor: 'discoB', label: 'Regulars', required: true, script: [
          ['discoA', 'We took the subway all the way down to Canal Street just for this place!', 'happy'],
          ['discoB', 'In Cantonese, going out for dim sum is called "yum cha." It means "drink tea."'],
          ['discoA', 'The tea is the main event. The dumplings are a bonus!', 'happy']
        ] },
        { id: 'kid', actor: 'kid', label: 'Kid on a stool', required: true, script: [
          ['kid', 'Wheeeee! Uncle Wally lets me spin on the stools!', 'happy'],
          ['kid', 'My name\'s Wilson. My family comes to Chinatown on weekends!'],
          ['narr', 'Remember that name...']
        ] },
        { id: 'boombox', label: 'Boombox', at: [980, 280], area: [880, 300, 200, 92], script: [
          ['narr', '♪ Somebody\'s boombox is playing disco and funk.']
        ] },
        { id: 'poster', label: 'Poster', at: [488, 200], area: [436, 128, 104, 150], script: [
          ['narr', 'A poster advertises mooncakes in groovy lettering. The bakery is still going strong.']
        ] },
        { id: 'window', label: 'Window', at: [220, 430], area: [58, 300, 324, 257], script: [
          ['narr', 'A big yellow Checker cab squeezes down the narrow street.']
        ] }
      ],
      sceneDone: {
        room: [
          { enter: 'cart70' }, { sfx: 'squeak' },
          ['cart70', 'Siu mai! Har gow! Lo bak go!', 'happy'],
          ['cart70', 'Take a look — what looks good?'],
          { order: { who: 'cart70', options: ['siu_mai', 'turnip_cake', 'cheung_fun'] } },
          ['cart70', 'I\'ll stamp your card. Pay at the counter when you\'re done!']
        ]
      },
      extras: { cart70: { x: 470, y: 905, s: 0.98, cart: true } },
      next: 'Order some tea'
    },

    // ------------------------------------------------------------ 1990s–2000s
    {
      id: 's1990', label: '1990s–2000s', title: 'Order some tea', grade: 'e1990', music: 'e1990',
      scenes: {
        room: { kind: 'room', room: 'e1990', actors: [
          { id: 'pal96', x: 1470, y: 560, s: 0.5 }, { id: 'wally96', x: 1270, y: 560, s: 0.5 },
          { id: 'crew90', x: 440, y: 905, s: 0.84 },
          { id: 'cart90', x: 1000, y: 905, s: 0.98, cart: true }
        ] }
      },
      start: 'room',
      prompt: 'Order some tea from the dim sum lady.',
      intro: [
        ['narr', 'The 1990s. It\'s quieter now. Huge new dim sum palaces with hundreds of seats have opened nearby.'],
        ['narr', 'Over in the corner, a movie crew is setting up lights.']
      ],
      spots: [
        { id: 'cart', actor: 'cart90', label: 'Dim sum lady', required: true, script: [
          { sfx: 'squeak' },
          ['cart90', 'Tea first! What kind would you like?'],
          { tea: { who: 'cart90' } },
          ['cart90', 'Here\'s a tip: when someone pours your tea, tap two fingers on the table. It means "thank you."'],
          { tap: true },
          ['cart90', 'Perfect! Now you\'re a real regular.', 'happy']
        ] },
        { id: 'wally', actor: 'wally96', label: 'Wally', required: true, script: [
          ['wally96', 'Sit, sit. You play cards?'],
          ['wally96', 'These days it\'s mostly old friends. We play cards and drink oolong. Chefs from other restaurants come by after their shifts.'],
          ['wally96', 'Movie people love this room too. "Law & Order" filmed here. That pays more than the dumplings!', 'happy'],
          ['wally96', 'The young people? They do other things now. Maybe someday, somebody will want this place.', 'worried']
        ] },
        { id: 'crew', actor: 'crew90', label: 'Film crew', script: [
          ['crew90', 'You can\'t build a set like this. Real tin ceiling, real tiles, real history.'],
          ['crew90', 'This room has been in movies and TV shows for years.']
        ] },
        { id: 'sacks', label: 'Rice sacks', at: [660, 560], area: [570, 560, 180, 100], script: [
          ['narr', 'Sacks of rice slump against the wall, and the tea tins are dusty. The place could use a little love...']
        ] },
        { id: 'window', label: 'Window', at: [220, 430], area: [58, 300, 324, 257], script: [
          ['narr', 'A yellow Crown Victoria taxi honks its way down the block.']
        ] }
      ],
      next: 'Check out the new menu'
    },

    // ------------------------------------------------------------ 2010
    {
      id: 's2010', label: '2010', title: 'Check out the new menu', grade: 'e2010', music: 'e2010',
      scenes: {
        room: { kind: 'room', room: 'e2010', actors: [{ id: 'wally10', x: 1330, y: 560, s: 0.5 }, { id: 'wilson10', x: 990, y: 905, s: 1 }] }
      },
      start: 'room',
      prompt: 'Talk to Wilson and Wally — then order from the new menu.',
      intro: [
        ['narr', '2010. The carts are gone! The walls are freshly painted, there are tablecloths, and four new lights hang overhead.']
      ],
      spots: [
        { id: 'wilson', actor: 'wilson10', label: 'Wilson', required: true, script: [
          ['wilson10', 'Hi! I\'m Wilson Tang. Remember the kid spinning on the stools? That was me!', 'happy'],
          ['wilson10', 'I worked in finance at Morgan Stanley, ran my own bakery on Allen Street, then went back to finance...'],
          ['wilson10', 'But when Uncle Wally was ready to retire, nobody else wanted this place. I did.'],
          ['you', 'So what\'s changing?'],
          ['wilson10', 'No more carts. Everything is cooked to order, so it comes out hot and fresh. And we serve dim sum into the night.'],
          ['wilson10', 'We gutted the kitchen for new equipment. New paint, patched floors, four new lights, tablecloths. That\'s about it.'],
          ['wilson10', 'The booths, the tin ceiling, the tile floor, that old glass counter — they stay. This is what the place looked like in the \'50s.'],
          ['wilson10', 'Oh, and Nom Wah is on the internet now! Website, Facebook, Twitter...', 'happy']
        ] },
        { id: 'wally', actor: 'wally10', label: 'Uncle Wally', required: true, script: [
          ['wally10', 'I offered to modernize the dining room for him. He said no! Keep the old tiles and the stools.'],
          ['wally10', 'Sixty years of my life are in this room. I was worried...', 'worried'],
          ['wally10', 'But he didn\'t mess it up. I\'m proud of him.', 'happy']
        ] },
        { id: 'menu', label: 'Order sheet', at: [880, 786], area: [760, 776, 240, 110], required: true, script: [
          ['narr', 'Instead of waiting for a cart, you check off what you want on a paper order sheet.'],
          { order: { who: 'narr', prompt: 'Check a box:', options: ['egg_roll', 'snow_pea_dumplings', 'noodles'] } },
          ['narr', 'A few minutes later it arrives — cooked to order and piping hot.']
        ] },
        { id: 'counter', label: 'Glass counter', at: [660, 430], area: [520, 404, 300, 82], script: [
          ['narr', 'This glass counter has been here for about ninety years. Wilson calls the place "a piece of New York history."']
        ] },
        { id: 'cabinet', label: 'Tea cabinet', at: [700, 250], area: [560, 186, 300, 200], script: [
          ['narr', 'The tea cabinet was painted green for decades. Wilson picked this blue in 2010.']
        ] },
        { id: 'window', label: 'Window', at: [220, 430], area: [58, 300, 324, 257], script: [
          ['narr', 'A yellow hybrid taxi zips past with an ad glowing on its roof.']
        ] }
      ],
      next: 'Skip ahead to the 100th birthday'
    },

    // ------------------------------------------------------------ 2020
    {
      id: 's2020', label: '2020', title: '100 years', grade: 'e2020', music: 'e2020',
      scenes: {
        room: { kind: 'room', room: 'e2020', actors: [{ id: 'insta20', x: 1260, y: 560, s: 0.5 }, { id: 'wilson20', x: 990, y: 905, s: 1 }] }
      },
      start: 'room',
      prompt: 'Talk to Wilson and the customer.',
      intro: [
        ['narr', '2020. Nom Wah turns 100 years old!'],
        ['narr', 'But it\'s the Lunar New Year season — usually the busiest time of the year — and half the tables are empty.']
      ],
      spots: [
        { id: 'wilson', actor: 'wilson20', label: 'Wilson', required: true, script: [
          ['wilson20', 'Welcome! You picked a strange time to visit.', 'worried'],
          ['wilson20', 'News about the coronavirus has people scared, and a lot of that fear got aimed at Chinatown. Customers just stopped coming.', 'worried'],
          ['you', 'Are you worried?'],
          ['wilson20', 'Small immigrant-run businesses are very resourceful and resilient. They don\'t have debt. They live within their means.', 'serious'],
          ['wilson20', 'If we have to close the dining room, we\'ll ship frozen dumplings across the country. I\'ll drive deliveries myself!'],
          ['wilson20', 'Nom Wah has survived for a hundred years. We\'ll get through this too.', 'happy']
        ] },
        { id: 'insta', actor: 'insta20', label: 'Customer', required: true, script: [
          { sfx: 'shutter' },
          ['insta20', 'Hold on — the camera eats first!', 'happy'],
          ['insta20', 'Nom Wah is all over Instagram. Vogue even threw a Met Gala party here in 2015 — lion dancers and silk pajamas!'],
          ['insta20', 'And now there are Nom Wahs in Philadelphia and even in Shenzhen, China.']
        ] },
        { id: 'banner', label: '100 Years banner', at: [1354, 168], area: [1124, 140, 460, 56], script: [
          ['narr', 'A banner reads "100 YEARS." This fall, Wilson will publish The Nom Wah Cookbook to celebrate.']
        ] },
        { id: 'takeout', label: 'Takeout', at: [790, 318], area: [700, 312, 196, 80], script: [
          ['narr', 'Takeout bags and boxes of frozen dumplings, ready to go.']
        ] },
        { id: 'window', label: 'Window', at: [220, 430], area: [58, 300, 324, 257], script: [
          ['narr', 'Doyers Street is mostly closed to cars now. A delivery rider zips by on an e-bike.']
        ] }
      ],
      sceneDone: {
        room: [
          ['narr', 'Across Chinatown, neighbors rally to support each other\'s small businesses. Nom Wah, which has always shown up for the community, is right in the middle of it.']
        ]
      },
      next: 'Finish your meal'
    },

    // ------------------------------------------------------------ Today
    {
      id: 'sToday', label: 'Today', title: 'Finish your meal', grade: 'e2026', music: 'today',
      scenes: {
        room: { kind: 'room', room: 'e2026', actors: [{ id: 'nj1', x: 1252, y: 560, s: 0.5 }, { id: 'nj2', x: 1452, y: 560, s: 0.5 }, { id: 'server26', x: 990, y: 905, s: 1 }] },
        street: { kind: 'street', era: 'today', startZoom: [1.5, 800, 470], actors: [{ id: 'guide26', x: 1250, y: 980, s: 0.86 }] }
      },
      start: 'room',
      prompt: 'Finish your meal — talk to your server and the customers.',
      prompts: { street: 'Talk to the tour guide.' },
      intro: [
        ['narr', 'Today. Every seat is full, and there\'s a line out the door.']
      ],
      spots: [
        { id: 'server', actor: 'server26', label: 'Server', required: true, script: [
          ['server26', 'Last pot of tea for you! And one egg roll — Nom Wah calls it "The Original."', 'happy'],
          { dish: 'egg_roll' },
          { sfx: 'pour' },
          ['server26', 'More than a hundred years, and it\'s still the same booths, the same tin ceiling, the same counter.'],
          ['narr', 'Say thanks the regular way.'],
          { tap: true },
          ['server26', 'Ha! Somebody taught you well.', 'happy']
        ] },
        { id: 'nj', actor: 'nj1', alsoActor: 'nj2', label: 'Customers', required: true, script: [
          ['nj1', 'We drove in from New Jersey just for these dumplings.'],
          ['nj2', 'Worth the line. Every single time.', 'happy']
        ] },
        { id: 'walls', label: 'Photos & clippings', at: [1400, 170], area: [1130, 160, 450, 200], script: [
          ['narr', 'Framed newspaper clippings and photos cover the walls — more than a century of visitors.']
        ] },
        { id: 'window', label: 'Window', at: [220, 430], area: [58, 300, 324, 257], script: [
          ['narr', 'Outside, a Citi Bike rolls past. No cars on Doyers Street today.']
        ] },
        // ---- out on the street
        { id: 'guide', scene: 'street', actor: 'guide26', label: 'Tour guide', required: true, script: [
          ['guide26', 'And here, in the crook of Doyers Street: Nom Wah Tea Parlor, open since 1920!', 'happy'],
          ['guide26', 'See that pink awning? It used to be bright red. A century of sunshine will do that.'],
          ['guide26', 'A bakery, a tea parlor, dim sum carts, then cooked to order... It keeps changing just enough to stay the same.']
        ] },
        { id: 'sign', scene: 'street', label: 'Sign', at: [800, 300], area: [650, 286, 300, 150], script: [
          ['narr', '南華茶室 — Nom Wah Tea Parlor. The Chinese name means, roughly, "South China Tea House."']
        ] },
        { id: 'mural', scene: 'street', label: 'Street mural', at: [460, 820], area: [200, 760, 520, 140], script: [
          ['narr', 'The street itself is painted with a giant mural called "Rice Terraces." Doyers Street belongs to people now, not cars.']
        ] }
      ],
      sceneDone: {
        room: [
          ['narr', 'You finish the last sip of tea.'],
          { button: 'Head outside' },
          { sfx: 'door_bell' }, { scene: 'street' }, { zoom: [1, 800, 470] },
          ['narr', 'You step back out onto Doyers Street. Same crooked bend, a hundred years later.']
        ]
      },
      next: 'See what you learned'
    }
  ];

  // ---------------------------------------------------------------- the ending
  var ENDING = {
    title: 'One table. 100+ years.',
    question: 'How has Nom Wah stayed in business, and in the family, for more than a century?',
    ingredients: [
      { icon: 'almond_cookie', name: 'Great pastries & tea', text: 'Almond cookies and mooncakes kept the lights on for decades. The bakery came first.' },
      { icon: 'cha_siu_bao', name: 'Hard work, passed down', text: 'Wally went from dishwasher (1950) to manager to owner (1974), then handed it on to Wilson (2010).' },
      { icon: 'tea', name: 'Keep the old room', text: 'The booths, the tin ceiling, the tile floor and the ninety-year-old counter never left.' },
      { icon: 'egg_roll', name: 'Change what matters', text: 'Carts became cooked-to-order, dim sum ran into the night, and Nom Wah went online.' },
      { icon: 'har_gow', name: 'Resilience & community', text: 'No debt, living within their means, and showing up for Chinatown, even in 2020.' }
    ]
  };

  var SOURCES = [
    { t: 'Tenement Museum — "Tea Time: The Story of the Nom Wah Tea Parlor"', u: 'https://www.tenement.org/blog/tea-time-the-story-of-the-nom-wah-tea-parlor/' },
    { t: 'City Lore / Place Matters — Nom Wah Tea Parlor', u: 'https://citylore.org/places/nom-wah-tea-parlor/' },
    { t: 'Columbia Business School — Nom Wah Tea Parlor: A 90-Year Legacy', u: 'https://business.columbia.edu/global-family-enterprise/family-enterprise-insights/nom-wah-tea-parlor-90-year-legacy-family-and' },
    { t: 'The New Yorker (2020) — The Oldest Restaurant in Manhattan\'s Chinatown Faces the Coronavirus Shutdown', u: 'https://www.newyorker.com/magazine/2020/03/30/the-oldest-restaurant-in-manhattans-chinatown-faces-the-coronavirus-shutdown' },
    { t: 'Grub Street (2023)', u: 'https://www.grubstreet.com/2023/05/nom-wah-tea-parlor-nyc-lawsuit.html' },
    { t: 'The New York Times (1994) — Chinatown: On Pell Street, Only Memories of a Violent Past', u: 'https://www.nytimes.com/1994/06/12/nyregion/neighborhood-report-chinatown-on-pell-street-only-memories-of-a-violent-past.html' },
    { t: 'NYPL — Author Talk: The Nom Wah Cookbook', u: 'https://www.nypl.org/blog/2022/06/24/author-talk-nom-wah-cookbook' },
    { t: 'Nom Wah Tea Parlor — Our Story / Chinatown', u: 'https://www.nomwah.com/chinatown' },
    { t: 'Cookery by the Book — The Nom Wah Cookbook with Wilson Tang (tea cabinet, "if it\'s not broken")', u: 'https://www.cookerybythebook.com/home/2020/12/27/the-nom-wah-cookbook-wilson-tang' },
    { t: 'MOFAD City — Nom Wah (carts under Wally)', u: 'http://city.mofad.org/chinatown/explore/nomwah' },
    { t: 'Signal v. Noise — Steeped in History (cards, oolong, what Wilson kept)', u: 'https://signalvnoise.com/svn3/steeped-in-history/' },
    { t: 'Resy (2020) — The Enduring Value of New York\'s Oldest Chinese Restaurant', u: 'https://blog.resy.com/2020/08/the-enduring-value-of-new-yorks-oldest-chinese-restaurant/' },
    { t: 'AP via Mining Journal (2020) — Nom Wah at 100: a cookbook about a restaurant & community', u: 'https://www.miningjournal.net/life/saturday-food-drink/2020/11/nom-wah-at-100-a-cookbook-about-a-restaurant-community/' },
    { t: 'U.S. Office of the Historian — Repeal of the Chinese Exclusion Act, 1943', u: 'https://history.state.gov/milestones/1937-1945/chinese-exclusion-act-repeal' },
    { t: 'Wikipedia — Doyers Street (pedestrian street, "Rice Terraces" mural)', u: 'https://en.wikipedia.org/wiki/Doyers_Street' }
  ];

  var NOTES = [
    'This is an unofficial student/fan project. It is not affiliated with or endorsed by Nom Wah Tea Parlor.',
    'Dialogue is dramatized from the sources. Quotes from Wilson Tang are adapted from published interviews. Portraits are illustrations, not likenesses.',
    'The waiter, Mr. Lee, the dim sum ladies, the customers, the film crew and the tour guide are fictional characters.',
    'Sources disagree on a few dates. Nom Wah says it opened in 1920, and the Choys are its first documented owners. Most sources say Wally bought it in 1974; the Tenement Museum says 1976.',
    'Wilson calls Wally "Uncle Wally." Sources disagree on whether they are related by blood.'
  ];

  root.STORY = { CAST: CAST, DISHES: DISHES, TEAS: TEAS, STOPS: STOPS, ENDING: ENDING, SOURCES: SOURCES, NOTES: NOTES,
    TITLE: 'One Table, 100 Years', SUBTITLE: 'A Nom Wah Tea Parlor story · Doyers Street, 1920 → Today' };
})(typeof window !== 'undefined' ? window : globalThis);
