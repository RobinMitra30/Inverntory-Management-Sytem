
const catalog = [
  { name: "Copper Wire 0.75mm" }, { name: "Copper Wire 1mm" }, { name: "Copper Wire 1.5mm" }, { name: "Copper Wire 2.5mm" }, { name: "Copper Wire 4mm" }, { name: "Copper Wire 6mm" }, { name: "Copper Wire 10mm" },
  { name: "Aluminum Wire" }, { name: "Flexible Wire" }, { name: "Armored Cable" }, { name: "Control Cable" }, { name: "LAN Cable" }, { name: "CAT6 Cable" }, { name: "Coaxial Cable" },
  { name: "PVC Conduit Pipe" }, { name: "GI Conduit Pipe" }, { name: "PVC Junction Box" }, { name: "Metal Junction Box" },
  { name: "Modular Switch" }, { name: "Modular Socket" }, { name: "Power Socket" }, { name: "Industrial Socket" },
  { name: "MCB" }, { name: "MCCB" }, { name: "RCCB" }, { name: "Distribution Board" }, { name: "Electrical Panel" },
  { name: "ACB Panel" }, { name: "MCC Panel" }, { name: "Relay" }, { name: "Contactor" }, { name: "Selector Switch" },
  { name: "Push Button" }, { name: "Cable Tray" }, { name: "Cable Gland" }, { name: "Electrical Tape" }, { name: "Heat Shrink Sleeve" },
  { name: "LED Bulb" }, { name: "LED Tube Light" }, { name: "LED Panel Light" }, { name: "COB Light" }, { name: "Flood Light" }, { name: "Street Light" }, { name: "Pendant Light" }, { name: "Track Light" }, { name: "Chandelier" },
  { name: "Exhaust Fan" }, { name: "Ceiling Fan" }, { name: "Wall Fan" }, { name: "Industrial Fan" },
  { name: "Door Bell" }, { name: "Digital Meter" }, { name: "UPS" }, { name: "Servo Stabilizer" }, { name: "Battery Bank" }, { name: "Inverter" },
  { name: "PVC Pipe" }, { name: "CPVC Pipe" }, { name: "UPVC Pipe" }, { name: "HDPE Pipe" }, { name: "PPR Pipe" }, { name: "SWR Pipe" }, { name: "GI Pipe" }, { name: "SS Pipe" },
  { name: "Pipe Elbow" }, { name: "Pipe Tee" }, { name: "Pipe Reducer" }, { name: "Pipe Union" }, { name: "Pipe Clamp" }, { name: "Pipe Coupling" },
  { name: "Ball Valve" }, { name: "Gate Valve" }, { name: "Angle Valve" },
  { name: "Bib Cock" }, { name: "Health Faucet" }, { name: "Shower Head" }, { name: "Rain Shower" },
  { name: "Flush Tank" }, { name: "PVC Solvent" }, { name: "Teflon Tape" }, { name: "Wash Basin" }, { name: "Kitchen Sink" },
  { name: "Floor Trap" }, { name: "Bottle Trap" }, { name: "Water Tank" },
  { name: "Pressure Pump" }, { name: "Booster Pump" }, { name: "Submersible Pump" }, { name: "Sewage Pump" },
  { name: "Grease Trap" }, { name: "Water Meter" }, { name: "Manhole Cover" },
  { name: "OPC Cement" }, { name: "PPC Cement" }, { name: "White Cement" },
  { name: "River Sand" }, { name: "M Sand" }, { name: "Aggregate" }, { name: "Crushed Stone" },
  { name: "Red Brick" }, { name: "Fly Ash Brick" }, { name: "AAC Block" }, { name: "Concrete Block" }, { name: "Paver Block" }, { name: "Kerb Stone" },
  { name: "TMT Bar" }, { name: "Binding Wire" }, { name: "MS Rod" }, { name: "MS Angle" }, { name: "MS Channel" }, { name: "MS Pipe" }, { name: "MS Square Pipe" }, { name: "Steel Plate" }, { name: "Chequered Plate" },
  { name: "Scaffolding Pipe" }, { name: "Scaffolding Clamp" }, { name: "Centering Plate" }, { name: "Shuttering Plywood" },
  { name: "Concrete Admixture" }, { name: "Waterproof Compound" }, { name: "Ready Mix Concrete" }, { name: "Expansion Joint" }, { name: "Curing Compound" },
  { name: "Wall Primer" }, { name: "Exterior Primer" }, { name: "Interior Paint" }, { name: "Exterior Paint" }, { name: "Enamel Paint" }, { name: "Texture Paint" },
  { name: "PU Polish" }, { name: "Wood Polish" }, { name: "Spray Paint" }, { name: "Wall Putty" },
  { name: "Tile Adhesive" }, { name: "Tile Grout" }, { name: "Epoxy Grout" }, { name: "Epoxy Resin" }, { name: "Silicone Sealant" }, { name: "Acrylic Sealant" }, { name: "PU Foam" }, { name: "Rust Remover" }, { name: "Concrete Hardener" }, { name: "Waterproof Coating" }, { name: "Anti Fungus Coating" },
  { name: "Paint Roller" }, { name: "Paint Brush" }, { name: "Thinner" }
];

const nameCounts = {};
catalog.forEach(item => {
    nameCounts[item.name] = (nameCounts[item.name] || 0) + 1;
});

const duplicates = Object.keys(nameCounts).filter(name => nameCounts[name] > 1);
console.log('Duplicates:', duplicates);
