import { PrismaClient, RemedyCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const remedies: {
  remedyName: string; targetPest: string; category: RemedyCategory; ingredients: string[]; preparation: string[]; dosage: string; timing: string; safety: string;
}[] = [
  {
    remedyName: 'Dashparni Ark',
    targetPest: 'Sucking pests, bollworm, leaf-eating caterpillars, mites',
    category: 'PEST',
    ingredients: ['10 kinds of bitter or pungent leaves (neem, karanj, custard apple, castor, calotropis, tulsi, lantana, papaya, guava, gliricidia), 2 kg of each', '5 litres cow urine', '2 kg fresh cow dung', '500 g garlic paste', '500 g green chilli paste', '200 litres water'],
    preparation: ['Crush the leaves and mix them with the cow urine, dung, garlic and chilli pastes in a 200 litre drum.', 'Add water, stir well and cover the drum with a cloth in the shade.', 'Stir clockwise twice a day and ferment for 30 to 40 days.', 'Filter through a cloth. Store the extract in a closed container in the shade; it keeps for about 6 months.'],
    dosage: '2.5 to 3 litres of extract per 100 litres of water (250 to 300 ml per 10 litre sprayer).',
    timing: 'Spray at first sign of pests, early morning or late evening. Repeat after 10 to 12 days if needed.',
    safety: 'Wear gloves and a mask while crushing and filtering. Keep away from children and animals. Wash vegetables before eating. Check the dose on a few plants first.',
  },
  {
    remedyName: 'Neem Oil Emulsion',
    targetPest: 'Aphids, whitefly, jassids, thrips, mites, early powdery mildew',
    category: 'PEST',
    ingredients: ['Cold-pressed neem oil', 'Mild liquid soap or soapnut extract (emulsifier)', 'Clean water'],
    preparation: ['Mix 3 to 5 ml neem oil with 1 ml liquid soap per litre of water.', 'Shake or stir hard until the mixture turns milky white.', 'Use the same day; the oil separates if left standing.'],
    dosage: '30 to 50 ml neem oil plus 10 ml soap per 10 litre sprayer.',
    timing: 'Spray late afternoon so leaves are not scorched by sun. Repeat every 7 to 10 days.',
    safety: 'Do not spray in hot midday sun. Test on a few leaves first. Avoid spraying open flowers, where bees visit.',
  },
  {
    remedyName: 'Garlic-Chili Spray',
    targetPest: 'Aphids, caterpillars, fruit borer, ants',
    category: 'PEST',
    ingredients: ['500 g garlic', '500 g green chilli', '3 litres water', 'A little soap as a sticker'],
    preparation: ['Grind garlic and green chilli to a paste (wear gloves).', 'Soak the paste in 3 litres of water overnight.', 'Filter through a cloth and top up with water to make 10 litres of stock.', 'Add a few drops of soap so the spray sticks to leaves.'],
    dosage: '300 to 500 ml of stock per 10 litre sprayer.',
    timing: 'Spray in the evening at first pest sighting. Repeat every 5 to 7 days during heavy attack.',
    safety: 'Chilli burns eyes and skin: wear gloves, and wash hands and face after. Do not spray against the wind.',
  },
  {
    remedyName: 'Sour Buttermilk Spray',
    targetPest: 'Powdery mildew, leaf curl virus spread, mites',
    category: 'DISEASE',
    ingredients: ['Buttermilk fermented 3 to 5 days', 'Clean water'],
    preparation: ['Keep buttermilk in a covered earthen or plastic pot in the shade for 3 to 5 days until sour.', 'Stir, then dilute with water just before spraying.'],
    dosage: '1 litre of sour buttermilk per 10 litre sprayer.',
    timing: 'Spray on dry mornings at first sign of white powdery patches. Repeat every 7 days, 3 to 4 times.',
    safety: 'Spray on a few plants first to check for leaf burn. Clean the sprayer well afterwards. Harmless to people.',
  },
  {
    remedyName: 'Trichoderma Seed and Soil Treatment',
    targetPest: 'Wilt, root rot, damping off',
    category: 'DISEASE',
    ingredients: ['Trichoderma culture powder', 'Well-rotted farmyard manure'],
    preparation: ['Mix 1 kg Trichoderma with 100 kg of moist, well-rotted farmyard manure.', 'Cover with a gunny bag for 7 days in shade, keeping it slightly moist.', 'Use as soil application before sowing or planting.'],
    dosage: '5 to 10 g per kg of seed for seed treatment; 100 kg enriched manure per acre for soil.',
    timing: 'At sowing or transplanting. Do not mix with chemical fungicides.',
    safety: 'Wear a mask when handling powder. Store cool and dry.',
  },
];

const fertilizers = [
  {
    name: 'Jeevamrut',
    summary: 'Liquid microbial culture that wakes up the soil. Applied monthly with irrigation.',
    ingredients: ['10 kg desi cow dung', '10 litres cow urine', '2 kg jaggery', '2 kg gram flour (besan)', 'A handful of soil from under an old tree or the field bund', '200 litres water'],
    steps: ['Dissolve all ingredients in 200 litres of water in a plastic drum.', 'Stir clockwise for 2 minutes, twice a day, for 2 to 7 days. Keep the drum in shade with a cloth cover.', 'It is ready when it smells sweet and fermented.', 'Use within 7 days of making.'],
    applicationRate: '200 litres per acre, through drip or with irrigation water, once a month.',
    curingDays: 3,
    benefits: ['Multiplies beneficial soil microbes', 'Improves nutrient availability', 'Costs almost nothing when you own a desi cow'],
  },
  {
    name: 'Panchagavya',
    summary: 'Five cow products fermented into a growth tonic, sprayed on leaves or given through drip.',
    ingredients: ['5 kg fresh cow dung', '500 g cow ghee', '3 litres cow urine', '2 litres cow milk', '2 litres curd', '3 litres tender coconut water', '3 kg jaggery', '12 ripe bananas'],
    steps: ['Mix cow dung and ghee well and keep for 3 days, stirring twice a day.', 'Add urine, milk and curd and stir.', 'Mash the bananas with the jaggery and coconut water, then add to the drum.', 'Cover with a cloth and stir twice daily for 15 to 21 days.', 'Filter before spraying.'],
    applicationRate: '3% foliar spray (300 ml per 10 litre sprayer), 3 sprays: vegetative, flowering and fruit set.',
    curingDays: 18,
    benefits: ['Boosts flowering and fruit set', 'Improves plant resilience to stress', 'Safe for use up to harvest'],
  },
  {
    name: 'Waste Decomposer',
    summary: 'Low-cost culture (from NCOF) that turns farm waste and cow dung into compost quickly.',
    ingredients: ['1 bottle (20 g) waste decomposer culture', '2 kg jaggery', '200 litres chlorine-free water'],
    steps: ['Dissolve 2 kg jaggery in 200 litres of water in a plastic drum.', 'Add the culture bottle and stir well.', 'Cover with a cloth and stir daily for 7 days, until a creamy layer forms.', 'The liquid is ready. Keep a little as starter for the next batch with fresh jaggery water.'],
    applicationRate: '200 litres per acre with irrigation, or sprinkle over crop residue heaps to speed up composting.',
    curingDays: 7,
    benefits: ['Compost ready in 30 to 40 days', 'Cheap and easy to multiply', 'Controls some soil-borne diseases'],
  },
  {
    name: 'Vermicompost',
    summary: 'Worm-made compost, rich in nitrogen and stable carbon. The base of the organic fertilizer plan.',
    ingredients: ['Epigeic earthworms (Eisenia fetida)', 'Cow dung (partly dried)', 'Crop residue and farm waste', 'Shade and moisture'],
    steps: ['Prepare a shaded bed or pit about 3 ft wide and 1 ft deep.', 'Layer crop residue, then partly dried cow dung. Moisten it.', 'Add worms (about 1 kg per bed) and cover with gunny sacks.', 'Sprinkle water daily to keep it moist, never soggy.', 'Harvest after 45 to 60 days when the material looks dark and crumbly. Dry the compost lightly in shade and sieve it.'],
    applicationRate: 'About 1 to 2 tonnes per acre at land preparation, depending on the crop (use the calculator).',
    curingDays: 50,
    benefits: ['Adds stable soil carbon', 'Improves water holding, which helps in drought', 'Slow, steady nutrient release'],
  },
];

async function main() {
  for (const r of remedies) await prisma.naturalRemedy.upsert({ where: { remedyName: r.remedyName }, update: r, create: r });
  for (const f of fertilizers) await prisma.bioFertilizer.upsert({ where: { name: f.name }, update: f, create: f });

  // Demo accounts
  const demo = await prisma.user.upsert({
    where: { phone: '9999999999' },
    update: {},
    create: { name: 'Demo Farmer', phone: '9999999999', passwordHash: await bcrypt.hash('demo1234', 12), region: 'Baramati, Pune' },
  });
  await prisma.user.upsert({
    where: { phone: '9000000000' },
    update: {},
    create: { name: 'Admin', phone: '9000000000', passwordHash: await bcrypt.hash('admin1234', 12), role: 'ADMIN' },
  });

  const existing = await prisma.farm.findFirst({ where: { userId: demo.id } });
  if (!existing) {
    const farm = await prisma.farm.create({
      data: {
        userId: demo.id, name: 'Demo farm, Baramati', totalArea: 2, soilType: 'Black cotton soil',
        sensors: { create: [{ sensorType: 'START_0M' }, { sensorType: 'MID_5M' }, { sensorType: 'END_10M' }] },
      },
    });
    const day = 86400000;
    const portfolio = await prisma.cropPortfolio.create({
      data: { farmId: farm.id, cropName: 'Finger Millet (Ragi)', variety: 'GPU-28', sowingDate: new Date(Date.now() - 40 * day), status: 'VEGETATIVE', totalWaterUsed: 24000 },
    });
    await prisma.farmRecord.createMany({
      data: [
        { portfolioId: portfolio.id, date: new Date(Date.now() - 40 * day), stage: 'SOWING', activity: 'Seed treatment and sowing', expense: 3200, notes: 'Treated seed with Trichoderma' },
        { portfolioId: portfolio.id, date: new Date(Date.now() - 33 * day), stage: 'GERMINATION', activity: 'First Jeevamrut round through drip', expense: 600 },
        { portfolioId: portfolio.id, date: new Date(Date.now() - 12 * day), stage: 'VEGETATIVE', activity: 'Weeding and Dashparni Ark spray', expense: 1800 },
      ],
    });
  }
  console.log('Seeded. Demo login: 9999999999 / demo1234   Admin: 9000000000 / admin1234');
}

main().finally(() => prisma.$disconnect());
