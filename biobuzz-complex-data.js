/**
 * BioBuzz's content lives here so new habitats, flowers and discoveries can be
 * added without changing the game loop. Coordinates are in world pixels;
 * hazard speed is radians/second, and all durations are in seconds.
 *
 * Pollination trails contain collect/pollinate pairs of the SAME species. The
 * second visit must be to a different flower. Each completed trail restores
 * one habitat patch; pollen carried home is a separate resource.
 */

export const FLOWERS = {
  clover: {
    id: 'clover', name: 'White clover', color: '#fff4d8', center: '#e6bc72', petals: 10,
    fact: 'White clover supplies nectar to bees, but it was introduced from Europe. A garden with locally native flowers supports a wider variety of wildlife.',
    habitat: 'Lawns & gardens · introduced to North America',
  },
  coneflower: {
    id: 'coneflower', name: 'Purple coneflower', color: '#ee83b5', center: '#9b5131', petals: 9,
    fact: 'Purple coneflowers provide food for visiting pollinators. This North American plant is a popular garden flower; check its native range before planting a wild habitat.',
    habitat: 'Sunny garden beds · native to parts of North America',
  },
  aster: {
    id: 'aster', name: 'New England aster', color: '#b898ff', center: '#f8c951', petals: 12,
    fact: 'New England asters bloom late in the season, feeding honey bees and bumble bee queens preparing for winter.',
    habitat: 'Meadows & sunny edges · Northeast native',
  },
  goldenrod: {
    id: 'goldenrod', name: 'Gray goldenrod', color: '#ffd45c', center: '#db982e', petals: 8,
    fact: 'Gray goldenrod grows even in poor soils. Its late yellow blooms offer food to many kinds of pollinators.',
    habitat: 'Dry meadows & open ground · Northeast native',
  },
  milkweed: {
    id: 'milkweed', name: 'Swamp milkweed', color: '#f69ac5', center: '#b4558e', petals: 5,
    fact: 'Swamp milkweed feeds flower visitors and is a host plant for monarch caterpillars. Different life stages need different kinds of food!',
    habitat: 'Wet meadows & pond edges · Northeast native',
  },
  monarda: {
    id: 'monarda', name: 'Wild bergamot', color: '#d391e8', center: '#865294', petals: 11,
    fact: 'Wild bergamot, also called bee balm, is a native wildflower visited by bumble bees. Plant a variety of flower shapes and bloom times to help more pollinators.',
    habitat: 'Sunny meadows & open woodland · Northeast native',
  },
};

export const DISCOVERIES = [
  ...Object.values(FLOWERS).map(flower => ({
    id: flower.id, name: flower.name, category: 'Flowers', icon: '✿', fact: flower.fact,
  })),
  {
    id: 'rain', name: 'A passing shower', category: 'Habitats', icon: '☂',
    fact: 'Water supports flowers and wildlife. You can help thirsty insects with a shallow water dish and a few stones to land on.',
  },
  {
    id: 'spider', name: 'Garden spider', category: 'Wildlife', icon: '🕸',
    fact: 'Spiders are part of a healthy garden: they eat insects and help control pests. Give them space as you fly past.',
  },
  {
    id: 'bird', name: 'A bird on patrol', category: 'Wildlife', icon: '🪶',
    fact: 'Many birds depend on insects for food. Protecting insect habitat helps the whole food web, including our feathered neighbors.',
  },
  {
    id: 'pesticide', name: 'Pesticide drift', category: 'Conservation', icon: '⚠',
    fact: 'Some pesticides can harm pollinators. Reducing unnecessary pesticide use and protecting flowering habitat helps bees and other wildlife.',
  },
  {
    id: 'hive', name: 'The pollen pantry', category: 'Bees', icon: '⬡',
    fact: 'Pollen provides protein for growing bees. Your hive is inspired by social honey bees; most wild bee species raise their young without a shared hive.',
  },
  {
    id: 'bumblebee', name: 'Bumble bee', category: 'Bees', icon: '🐝',
    fact: 'Bumble bees can shake pollen loose with their flight muscles. This is called buzz pollination, and it helps plants such as tomatoes.',
  },
  {
    id: 'solitary', name: 'Solitary bees', category: 'Bees', icon: '◌',
    fact: 'Most wild bees are solitary: each female makes her own nest and provides food for her offspring. Bare soil and hollow stems can be valuable nesting places.',
  },
  {
    id: 'restoration', name: 'A habitat returns', category: 'Conservation', icon: '🌱',
    fact: 'Bees carry pollen between flowers of the same species, helping plants make seeds. Planting local native flowers that bloom from spring to fall supports this living network.',
  },
];

export const ABILITIES = [
  {
    id: 'dash', name: 'Petal dash', icon: '➜', unlock: 0, cooldown: 5, duration: 0.7,
    description: 'A quick burst of speed. Press Space while flying to slip through a gap or get home faster.',
  },
  {
    id: 'shield', name: 'Dewdrop shield', icon: '◈', unlock: 1, cooldown: 12, duration: 3,
    description: 'A protective bubble that blocks hazard damage for three seconds. Unlocked after Backyard Garden.',
  },
  {
    id: 'magnet', name: 'Pollen breeze', icon: '✧', unlock: 2, cooldown: 10, duration: 4,
    description: 'Reach nearby flowers from farther away for four seconds. Unlocked after Wildflower Meadow.',
  },
];

export const BADGES = [
  { id: 'first_delivery', name: 'Special delivery', description: 'Bring your first pollen home to the hive.', icon: '⬡' },
  { id: 'first_level', name: 'Garden graduate', description: 'Complete Backyard Garden.', icon: '🌼' },
  { id: 'botanist', name: 'Field botanist', description: 'Discover all six flower species.', icon: '✿' },
  { id: 'guardian', name: 'Ecosystem guardian', description: 'Complete all five habitats.', icon: '♛' },
  { id: 'untouched', name: 'Gentle wings', description: 'Complete a habitat without taking damage.', icon: '♡' },
  { id: 'swift', name: 'Golden hour', description: 'Complete a habitat with at least half its time remaining.', icon: '☀' },
  { id: 'restorer', name: 'Room to bloom', description: 'Restore all three patches in Pollinator Preserve.', icon: '🌱' },
];

export const LEVELS = [
  {
    id: 0, name: 'Backyard Garden', subtitle: 'Every adventure starts with a flower',
    description: 'Fly with WASD or the arrow keys. Touch flowers to gather pollen, visit two different clovers in order, then fly into the hive to deliver six pollen. Space gives you a dash.',
    theme: 'garden', width: 1400, height: 900, time: 180, target: 6,
    hive: { x: 200, y: 450 },
    sequences: [['clover', 'clover']],
    flowers: [
      { x: 360, y: 390, type: 'clover' }, { x: 515, y: 430, type: 'clover' },
      { x: 400, y: 590, type: 'coneflower' }, { x: 615, y: 610, type: 'coneflower' },
      { x: 675, y: 290, type: 'clover' }, { x: 850, y: 380, type: 'clover' },
      { x: 955, y: 540, type: 'coneflower' }, { x: 1090, y: 390, type: 'coneflower' },
    ],
    obstacles: [{ x: 830, y: 735, r: 45, type: 'tree' }, { x: 480, y: 170, r: 34, type: 'rock' }],
    hazards: [
      { x: 1170, y: 155, r: 65, type: 'rain', speed: 0.2, range: 45, phase: 0 },
      { x: 1100, y: 735, r: 39, type: 'spider', speed: 0, range: 0, phase: 0 },
    ],
    patches: [{ x: 715, y: 475, r: 95 }],
  },
  {
    id: 1, name: 'Wildflower Meadow', subtitle: 'Follow the color, find your rhythm',
    description: 'Bring ten pollen home and complete two trails. Carry pollen from one flower to a different flower of the same species. Watch the meadow come alive.',
    theme: 'meadow', width: 1750, height: 1100, time: 210, target: 10,
    hive: { x: 200, y: 450 },
    sequences: [['aster', 'aster'], ['goldenrod', 'goldenrod']],
    flowers: [
      { x: 365, y: 365, type: 'aster' }, { x: 580, y: 400, type: 'aster' },
      { x: 385, y: 640, type: 'clover' }, { x: 570, y: 715, type: 'clover' },
      { x: 790, y: 540, type: 'goldenrod' }, { x: 1005, y: 620, type: 'goldenrod' },
      { x: 980, y: 285, type: 'aster' }, { x: 1190, y: 380, type: 'aster' },
      { x: 1370, y: 640, type: 'coneflower' }, { x: 1500, y: 820, type: 'coneflower' },
      { x: 1110, y: 890, type: 'goldenrod' }, { x: 1320, y: 920, type: 'goldenrod' },
    ],
    obstacles: [
      { x: 705, y: 190, r: 47, type: 'tree' }, { x: 690, y: 890, r: 35, type: 'rock' },
      { x: 1550, y: 330, r: 55, type: 'tree' },
    ],
    hazards: [
      { x: 890, y: 780, r: 32, type: 'bird', speed: 0.52, range: 120, phase: 0 },
      { x: 1310, y: 175, r: 82, type: 'rain', speed: 0.28, range: 75, phase: 1 },
      { x: 1490, y: 570, r: 43, type: 'spider', speed: 0, range: 0, phase: 0 },
    ],
    patches: [{ x: 770, y: 375, r: 100 }, { x: 1220, y: 665, r: 110 }],
  },
  {
    id: 2, name: 'Forest Edge', subtitle: 'Little wings, a wonderfully wild world',
    description: 'Weave through the trees, deliver fourteen pollen, and complete two trails to reconnect the forest clearings. Flowers in the shade are worth exploring.',
    theme: 'forest', width: 1950, height: 1250, time: 240, target: 14,
    hive: { x: 200, y: 450 },
    sequences: [['monarda', 'monarda', 'aster', 'aster'], ['milkweed', 'milkweed']],
    flowers: [
      { x: 390, y: 400, type: 'monarda' }, { x: 580, y: 460, type: 'monarda' },
      { x: 380, y: 710, type: 'clover' }, { x: 565, y: 825, type: 'clover' },
      { x: 835, y: 620, type: 'aster' }, { x: 1040, y: 690, type: 'aster' },
      { x: 940, y: 335, type: 'monarda' }, { x: 1160, y: 270, type: 'monarda' },
      { x: 1260, y: 895, type: 'milkweed' }, { x: 1470, y: 965, type: 'milkweed' },
      { x: 1580, y: 590, type: 'goldenrod' }, { x: 1760, y: 705, type: 'goldenrod' },
      { x: 975, y: 1030, type: 'aster' }, { x: 810, y: 1110, type: 'aster' },
      { x: 1640, y: 1060, type: 'milkweed' }, { x: 1740, y: 925, type: 'milkweed' },
    ],
    obstacles: [
      { x: 455, y: 205, r: 65, type: 'tree' }, { x: 740, y: 390, r: 65, type: 'tree' },
      { x: 725, y: 830, r: 56, type: 'tree' }, { x: 1135, y: 520, r: 72, type: 'tree' },
      { x: 1400, y: 440, r: 62, type: 'tree' }, { x: 1680, y: 325, r: 75, type: 'tree' },
      { x: 1080, y: 910, r: 36, type: 'rock' }, { x: 1540, y: 795, r: 38, type: 'rock' },
      { x: 445, y: 1055, r: 68, type: 'tree' },
    ],
    hazards: [
      { x: 645, y: 625, r: 43, type: 'spider', speed: 0, range: 0, phase: 0 },
      { x: 1220, y: 730, r: 33, type: 'bird', speed: 0.67, range: 105, phase: 0.6 },
      { x: 1460, y: 170, r: 88, type: 'rain', speed: 0.25, range: 75, phase: 2 },
      { x: 1430, y: 1170, r: 42, type: 'spider', speed: 0, range: 0, phase: 0 },
    ],
    patches: [{ x: 920, y: 480, r: 100 }, { x: 1355, y: 1045, r: 100 }],
  },
  {
    id: 3, name: 'Farm', subtitle: 'A place for crops. A place for wildlife.',
    description: 'Protect the field margins by finishing two pollination trails and delivering eighteen pollen. Steer around pesticide clouds and give the birds room to pass.',
    theme: 'farm', width: 2200, height: 1350, time: 270, target: 18,
    hive: { x: 200, y: 450 },
    sequences: [['goldenrod', 'goldenrod', 'monarda', 'monarda'], ['milkweed', 'milkweed', 'aster', 'aster']],
    flowers: [
      { x: 370, y: 400, type: 'goldenrod' }, { x: 565, y: 440, type: 'goldenrod' },
      { x: 395, y: 685, type: 'clover' }, { x: 595, y: 750, type: 'clover' },
      { x: 805, y: 605, type: 'monarda' }, { x: 1020, y: 670, type: 'monarda' },
      { x: 910, y: 310, type: 'coneflower' }, { x: 1130, y: 295, type: 'coneflower' },
      { x: 1320, y: 935, type: 'milkweed' }, { x: 1550, y: 995, type: 'milkweed' },
      { x: 1690, y: 660, type: 'aster' }, { x: 1910, y: 745, type: 'aster' },
      { x: 1840, y: 1070, type: 'monarda' }, { x: 2030, y: 1190, type: 'monarda' },
      { x: 835, y: 1095, type: 'goldenrod' }, { x: 1065, y: 1160, type: 'goldenrod' },
      { x: 1740, y: 320, type: 'aster' }, { x: 1950, y: 365, type: 'aster' },
    ],
    obstacles: [
      { x: 415, y: 185, r: 55, type: 'tree' }, { x: 725, y: 355, r: 32, type: 'rock' },
      { x: 690, y: 980, r: 56, type: 'tree' }, { x: 1210, y: 795, r: 36, type: 'rock' },
      { x: 1505, y: 525, r: 55, type: 'tree' }, { x: 1700, y: 1200, r: 40, type: 'rock' },
      { x: 2080, y: 530, r: 60, type: 'tree' },
    ],
    hazards: [
      { x: 800, y: 845, r: 77, type: 'pesticide', speed: 0.2, range: 38, phase: 0.4 },
      { x: 1375, y: 315, r: 90, type: 'pesticide', speed: 0.2, range: 48, phase: 2 },
      { x: 1530, y: 755, r: 33, type: 'bird', speed: 0.78, range: 155, phase: 0 },
      { x: 2030, y: 925, r: 88, type: 'rain', speed: 0.31, range: 65, phase: 1 },
      { x: 1270, y: 1205, r: 43, type: 'spider', speed: 0, range: 0, phase: 0 },
    ],
    patches: [{ x: 1070, y: 495, r: 105 }, { x: 1555, y: 1135, r: 110 }],
  },
  {
    id: 4, name: 'Pollinator Preserve', subtitle: 'Make room for a world in bloom',
    description: 'Your final flight: restore all three habitat patches, complete three trails, and deliver twenty-four pollen. Every flower is part of a bigger story.',
    theme: 'preserve', width: 2400, height: 1500, time: 330, target: 24,
    hive: { x: 200, y: 450 },
    sequences: [
      ['aster', 'aster', 'goldenrod', 'goldenrod'],
      ['milkweed', 'milkweed', 'monarda', 'monarda'],
      ['coneflower', 'coneflower', 'aster', 'aster'],
    ],
    flowers: [
      { x: 385, y: 390, type: 'aster' }, { x: 585, y: 450, type: 'aster' },
      { x: 415, y: 695, type: 'clover' }, { x: 610, y: 775, type: 'clover' },
      { x: 805, y: 600, type: 'goldenrod' }, { x: 1020, y: 690, type: 'goldenrod' },
      { x: 890, y: 285, type: 'monarda' }, { x: 1095, y: 350, type: 'monarda' },
      { x: 1270, y: 995, type: 'milkweed' }, { x: 1500, y: 1090, type: 'milkweed' },
      { x: 1600, y: 660, type: 'monarda' }, { x: 1820, y: 735, type: 'monarda' },
      { x: 1885, y: 1070, type: 'coneflower' }, { x: 2110, y: 1170, type: 'coneflower' },
      { x: 2030, y: 475, type: 'aster' }, { x: 2210, y: 575, type: 'aster' },
      { x: 940, y: 1230, type: 'goldenrod' }, { x: 1135, y: 1365, type: 'goldenrod' },
      { x: 1510, y: 285, type: 'milkweed' }, { x: 1740, y: 360, type: 'milkweed' },
      { x: 1700, y: 1320, type: 'aster' }, { x: 1915, y: 1370, type: 'aster' },
      { x: 500, y: 1180, type: 'coneflower' }, { x: 665, y: 1310, type: 'coneflower' },
    ],
    obstacles: [
      { x: 430, y: 180, r: 65, type: 'tree' }, { x: 745, y: 380, r: 61, type: 'tree' },
      { x: 680, y: 1015, r: 66, type: 'tree' }, { x: 1140, y: 860, r: 38, type: 'rock' },
      { x: 1345, y: 500, r: 68, type: 'tree' }, { x: 1555, y: 895, r: 46, type: 'rock' },
      { x: 1855, y: 535, r: 58, type: 'tree' }, { x: 2200, y: 850, r: 68, type: 'tree' },
      { x: 1480, y: 1330, r: 56, type: 'tree' }, { x: 2250, y: 1330, r: 55, type: 'tree' },
    ],
    hazards: [
      { x: 820, y: 825, r: 34, type: 'bird', speed: 0.85, range: 135, phase: 0.4 },
      { x: 1290, y: 250, r: 88, type: 'rain', speed: 0.35, range: 70, phase: 1.2 },
      { x: 1420, y: 755, r: 43, type: 'spider', speed: 0, range: 0, phase: 0 },
      { x: 1920, y: 190, r: 87, type: 'pesticide', speed: 0.22, range: 42, phase: 2 },
      { x: 1860, y: 905, r: 34, type: 'bird', speed: 0.9, range: 135, phase: 2.7 },
      { x: 1300, y: 1220, r: 78, type: 'pesticide', speed: 0.24, range: 38, phase: 0.5 },
      { x: 2170, y: 260, r: 85, type: 'rain', speed: 0.3, range: 65, phase: 0 },
    ],
    patches: [{ x: 1030, y: 505, r: 115 }, { x: 1450, y: 975, r: 115 }, { x: 2035, y: 970, r: 115 }],
  },
];

/** Sources for the field guide. Game abilities and instant restoration are fiction. */
export const SOURCES = [
  { title: 'USDA Forest Service · Attracting Pollinators', url: 'https://www.fs.usda.gov/Internet/FSE_DOCUMENTS/fseprd548063.pdf' },
  { title: 'Xerces Society · Pollinator Plants of the Northeast', url: 'https://xerces.org/sites/default/files/2018-05/17-051_03_XercesSoc_PollinatorPlants_Northeast-Region_web-3page.pdf' },
  { title: 'Xerces Society · Native Plants for Pollinators', url: 'https://xerces.org/publications/plant-lists/native-plants-for-pollinators-and-beneficial-insects-northeast' },
  { title: 'USDA NRCS · White Clover Plant Guide', url: 'https://www.nrcs.usda.gov/plantmaterials/idpmcpg10358.pdf' },
  { title: 'USDA Forest Service · Wild Bees', url: 'https://research.fs.usda.gov/nrs/understory/pollinator-habitat-log-landings-wild-bees' },
  { title: 'US Fish & Wildlife Service · Backyard Insects and Pollinators', url: 'https://www.fws.gov/story/2021-09/backyard-insects-and-pollinators' },
  { title: 'US Fish & Wildlife Service · Yellow Banded Bumble Bee', url: 'https://www.fws.gov/species/yellow-banded-bumble-bee-bombus-terricola' },
  { title: 'US Fish & Wildlife Service · Rusty Patched Bumble Bee', url: 'https://www.fws.gov/apps/species/rusty-patched-bumble-bee-bombus-affinis' },
  { title: 'US Fish & Wildlife Service · Threats to Pollinators', url: 'https://www.fws.gov/our-work/pollinators/threats-pollinators' },
];
