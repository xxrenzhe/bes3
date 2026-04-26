export interface HardcoreCategory {
  slug: string
  name: string
  coreProducts: string[]
  metrics: string[]
  painpoints: string[]
  redditSeeds: string[]
}

export const HARDCORE_CATEGORIES: HardcoreCategory[] = [
  {
    slug: 'yard-pool-automation',
    name: 'Yard and Pool Automation',
    coreProducts: ['boundary-free robot mowers', 'pool robots', 'cordless pressure washers'],
    metrics: ['obstacle pathing logic', 'pool wall climbing', 'true water pressure and flow', 'uneven terrain recovery'],
    painpoints: ['Boundary Free Navigation', 'Pool Wall Climbing', 'Real Water Pressure', 'Uneven Terrain'],
    redditSeeds: ['robot mower without boundary wire', 'pool robot climbs walls', 'cordless pressure washer real flow rate']
  },
  {
    slug: 'impact-wrenches',
    name: 'Impact Wrenches',
    coreProducts: ['impact wrenches', 'jump starters', 'garage tools'],
    metrics: ['real breakaway torque', 'stall behavior', 'cold-start discharge', 'battery sag'],
    painpoints: ['Rusty Lug Nuts', 'Cold Weather Starts', 'Battery Sag', 'Heavy DIY Use'],
    redditSeeds: ['impact wrench for rusted lug nuts', 'jump starter works below freezing']
  },
  {
    slug: 'smart-pet-gear',
    name: 'Smart Pet Gear',
    coreProducts: ['automatic litter boxes', 'smart feeders', 'pet-safe cleaners'],
    metrics: ['pinch sensor behavior', 'offline feeding', 'jam recovery', 'odor control'],
    painpoints: ['Safety Sensors', 'Offline Feeding', 'Odor Control', 'Jam Recovery'],
    redditSeeds: ['automatic litter box safe for cats', 'feeder still works when wifi is down']
  },
  {
    slug: 'espresso-gear',
    name: 'Espresso Gear',
    coreProducts: ['espresso machines', 'coffee grinders', 'high-power blenders'],
    metrics: ['warm-up time', 'grind retention', 'static mess', 'temperature stability'],
    painpoints: ['Fast Warmup', 'Low Static Grinding', 'Temperature Stability', 'Small Kitchen Use'],
    redditSeeds: ['espresso grinder static mess', 'machine warm up time in the morning']
  },
  {
    slug: 'power-stations',
    name: 'Power Stations',
    coreProducts: ['portable power stations', 'car fridges', 'camping power systems'],
    metrics: ['inverter efficiency', 'thermal derating', 'charge curve', 'runtime under load'],
    painpoints: ['Real Runtime', 'Hot Weather Use', 'Solar Charging', 'Fridge Runtime'],
    redditSeeds: ['power station real watt hours', 'car fridge in hot weather']
  },
  {
    slug: 'sim-racing',
    name: 'Sim Racing',
    coreProducts: ['direct-drive wheel bases', 'load-cell pedals', 'gaming headsets'],
    metrics: ['thermal fade', 'force feedback clipping', 'pedal repeatability', 'mic noise floor'],
    painpoints: ['Torque Fade', 'Brake Consistency', 'Quiet Mic', 'Desk Mounting'],
    redditSeeds: ['direct drive wheel overheating', 'load cell pedals worth it']
  },
  {
    slug: 'home-security',
    name: 'Home Security',
    coreProducts: ['video doorbells', 'smart locks', 'NVR camera kits'],
    metrics: ['cold battery drop', 'person detection error', 'subscription lock-in', 'night clarity'],
    painpoints: ['Cold Battery Life', 'No Subscription', 'Person Detection', 'Night Vision'],
    redditSeeds: ['doorbell camera no subscription', 'smart lock battery in winter']
  },
  {
    slug: 'fitness-tech',
    name: 'Fitness Tech',
    coreProducts: ['rowing machines', 'massage guns', 'red light therapy panels'],
    metrics: ['floor resonance', 'stall force', 'heat output', 'motor fade'],
    painpoints: ['Apartment Noise', 'Stall Force', 'Heavy User Support', 'Heat Stability'],
    redditSeeds: ['quiet rower apartment', 'massage gun stall force']
  },
  {
    slug: 'personal-care-tech',
    name: 'Personal Care Tech',
    coreProducts: ['high-speed hair dryers', 'IPL devices', 'skin cooling tools'],
    metrics: ['measured air speed', 'contact temperature', 'noise level', 'session heat'],
    painpoints: ['Fast Drying', 'Skin Cooling', 'Low Noise', 'Thick Hair'],
    redditSeeds: ['dyson alternative hair dryer real wind speed', 'ipl cooling actually works']
  },
  {
    slug: 'air-water',
    name: 'Air and Water',
    coreProducts: ['RO systems', 'air purifiers', 'wildfire smoke filters'],
    metrics: ['wastewater ratio', 'PM2.5 decay curve', 'filter cost', 'noise under load'],
    painpoints: ['Wildfire Smoke', 'Low Waste Water', 'Quiet Bedroom Use', 'Filter Cost'],
    redditSeeds: ['air purifier wildfire smoke', 'reverse osmosis waste water ratio']
  },
  {
    slug: 'maker-gear',
    name: 'Maker Gear',
    coreProducts: ['3D printers', 'resin printers', 'laser engravers'],
    metrics: ['tolerance', 'ringing', 'first layer failure', 'enclosure safety'],
    painpoints: ['High Speed Accuracy', 'First Layer Reliability', 'Low Fumes', 'Small Workshop'],
    redditSeeds: ['3d printer ringing at high speed', 'first layer keeps warping']
  },
  {
    slug: 'baby-tech',
    name: 'Baby Tech',
    coreProducts: ['strollers', 'baby monitors', 'smart bassinets'],
    metrics: ['cobblestone vibration', 'night vision clarity', 'disconnect alarms', 'fold force'],
    painpoints: ['Rough Pavement', 'Night Vision', 'Disconnect Alerts', 'One-Hand Fold'],
    redditSeeds: ['stroller for cobblestone streets', 'baby monitor disconnect alert']
  },
  {
    slug: 'travel-gear',
    name: 'Travel Gear',
    coreProducts: ['hard shell carry-ons', 'commuter backpacks', 'waterproof bags'],
    metrics: ['drop test damage', 'zipper water ingress', 'wheel wobble', 'strap fatigue'],
    painpoints: ['Drop Resistance', 'Real Waterproofing', 'Quiet Wheels', 'Heavy Laptop Carry'],
    redditSeeds: ['carry on drop test', 'backpack zipper waterproof in rain']
  },
  {
    slug: 'remote-office',
    name: 'Remote Office',
    coreProducts: ['ergonomic chairs', 'standing desks', 'condenser microphones'],
    metrics: ['desk wobble', 'lumbar support fatigue', 'motor noise', 'mic noise floor'],
    painpoints: ['Desk Wobble', 'Long Sitting Support', 'Quiet Motors', 'Clean Mic Audio'],
    redditSeeds: ['standing desk wobble at full height', 'office chair lumbar support heavy user']
  }
]
