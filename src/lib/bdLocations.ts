export interface BdArea {
  name: string;
  postalCode?: string;
}

export interface BdUpazila {
  name: string;
  areas: BdArea[];
}

export interface BdDistrict {
  name: string;
  isDhakaMetro?: boolean;
  upazilas: BdUpazila[];
}

export interface BdDivision {
  name: string;
  districts: BdDistrict[];
}

function createStandardUpazila(name: string, postalCode: string, extraAreas: BdArea[] = []): BdUpazila {
  const baseName = name.replace(/\s+Sadar$/i, '');
  const defaults: BdArea[] = [
    ...extraAreas,
    { name: `${baseName} Pourashava / Town`, postalCode },
    { name: `${name} Union Parishad`, postalCode },
    { name: 'Pourashava / Urban Area (Union N/A)', postalCode },
  ];
  const seen = new Set<string>();
  const unique = defaults.filter((area) => {
    const key = area.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { name, areas: unique };
}

function buildStandardDistrictUpazilas(
  specs: Array<[name: string, postalCode: string, extraAreas?: BdArea[]]>,
): BdUpazila[] {
  return specs.map(([name, postalCode, extraAreas]) => createStandardUpazila(name, postalCode, extraAreas));
}

export const BD_DIVISIONS: BdDivision[] = [
  {
    name: 'Dhaka',
    districts: [
      {
        name: 'Dhaka',
        isDhakaMetro: true,
        upazilas: [
          {
            name: 'Dhanmondi',
            areas: [
              { name: 'Dhanmondi 27 / Sobhanbag', postalCode: '1209' },
              { name: 'Dhanmondi 15 / Rayer Bazar', postalCode: '1209' },
              { name: 'Kalabagan', postalCode: '1205' },
              { name: 'Green Road', postalCode: '1205' },
              { name: 'Jigatola', postalCode: '1209' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '1209' },
            ],
          },
          {
            name: 'Gulshan',
            areas: [
              { name: 'Gulshan 1', postalCode: '1212' },
              { name: 'Gulshan 2', postalCode: '1212' },
              { name: 'Banani', postalCode: '1213' },
              { name: 'Baridhara', postalCode: '1212' },
              { name: 'Niketan', postalCode: '1212' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '1212' },
            ],
          },
          {
            name: 'Mirpur',
            areas: [
              { name: 'Mirpur 1', postalCode: '1216' },
              { name: 'Mirpur 2', postalCode: '1216' },
              { name: 'Mirpur 10', postalCode: '1216' },
              { name: 'Mirpur 11', postalCode: '1216' },
              { name: 'Mirpur 12', postalCode: '1216' },
              { name: 'Pallabi', postalCode: '1216' },
              { name: 'Kazipara / Shewrapara', postalCode: '1216' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '1216' },
            ],
          },
          {
            name: 'Uttara',
            areas: [
              { name: 'Sector 1 - 4', postalCode: '1230' },
              { name: 'Sector 5 - 9', postalCode: '1230' },
              { name: 'Sector 10 - 14', postalCode: '1230' },
              { name: 'Uttarkhan', postalCode: '1230' },
              { name: 'Dakshinkhan', postalCode: '1230' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '1230' },
            ],
          },
          {
            name: 'Mohammadpur',
            areas: [
              { name: 'Lalmatia', postalCode: '1207' },
              { name: 'Asad Gate', postalCode: '1207' },
              { name: 'Adabor', postalCode: '1207' },
              { name: 'Bosila', postalCode: '1207' },
              { name: 'Tajmahal Road', postalCode: '1207' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '1207' },
            ],
          },
          {
            name: 'Motijheel',
            areas: [
              { name: 'Motijheel Commercial Area', postalCode: '1000' },
              { name: 'Arambagh', postalCode: '1000' },
              { name: 'Fakirapool', postalCode: '1000' },
              { name: 'Kamalapur', postalCode: '1000' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '1000' },
            ],
          },
          {
            name: 'Banani',
            areas: [
              { name: 'Banani DOHS', postalCode: '1206' },
              { name: 'Banani Road 11', postalCode: '1213' },
              { name: 'Kakoli', postalCode: '1213' },
              { name: 'Mohakhali', postalCode: '1212' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '1213' },
            ],
          },
          {
            name: 'Badda',
            areas: [
              { name: 'Middle Badda', postalCode: '1212' },
              { name: 'North Badda', postalCode: '1212' },
              { name: 'Merul Badda', postalCode: '1212' },
              { name: 'Vatara / Bashundhara R/A', postalCode: '1229' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '1212' },
            ],
          },
          {
            name: 'Rampura',
            areas: [
              { name: 'East Rampura', postalCode: '1219' },
              { name: 'West Rampura', postalCode: '1219' },
              { name: 'Banasree', postalCode: '1219' },
              { name: 'Aftabnagar', postalCode: '1212' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '1219' },
            ],
          },
          {
            name: 'Khilgaon',
            areas: [
              { name: 'Khilgaon Taltola', postalCode: '1219' },
              { name: 'South Banasree', postalCode: '1219' },
              { name: 'Goran', postalCode: '1219' },
              { name: 'Basabo', postalCode: '1214' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '1219' },
            ],
          },
          {
            name: 'Tejgaon',
            areas: [
              { name: 'Farmgate', postalCode: '1215' },
              { name: 'Kawran Bazar', postalCode: '1215' },
              { name: 'Nakhalpara', postalCode: '1215' },
              { name: 'Tejgaon Industrial Area', postalCode: '1208' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '1215' },
            ],
          },
          {
            name: 'Shahbagh',
            areas: [
              { name: 'Shahbagh Square', postalCode: '1000' },
              { name: 'Paribagh', postalCode: '1000' },
              { name: 'Segunbagicha', postalCode: '1000' },
              { name: 'Dhaka University Area', postalCode: '1000' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '1000' },
            ],
          },
          {
            name: 'New Market',
            areas: [
              { name: 'Elephant Road', postalCode: '1205' },
              { name: 'Science Lab', postalCode: '1205' },
              { name: 'Nilkhet', postalCode: '1205' },
              { name: 'Azimpur', postalCode: '1205' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '1205' },
            ],
          },
          {
            name: 'Lalbagh',
            areas: [
              { name: 'Lalbagh Fort Area', postalCode: '1211' },
              { name: 'Chawkbazar', postalCode: '1211' },
              { name: 'Islampur', postalCode: '1100' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '1211' },
            ],
          },
          {
            name: 'Jatrabari',
            areas: [
              { name: 'Jatrabari Crossing', postalCode: '1204' },
              { name: 'Shonir Akhra', postalCode: '1236' },
              { name: 'Dholaipar', postalCode: '1204' },
              { name: 'Matuail Union', postalCode: '1362' },
            ],
          },
          {
            name: 'Demra',
            areas: [
              { name: 'Demra Bazar', postalCode: '1360' },
              { name: 'Sarulia Union', postalCode: '1361' },
              { name: 'Konapara', postalCode: '1362' },
            ],
          },
          {
            name: 'Savar',
            areas: [
              { name: 'Savar Pourashava', postalCode: '1340' },
              { name: 'Ashulia', postalCode: '1341' },
              { name: 'Hemayetpur', postalCode: '1340' },
              { name: 'Birulia Union', postalCode: '1340' },
              { name: 'Yearpur Union', postalCode: '1341' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Keraniganj', '1310', [{ name: 'Zinjira Union', postalCode: '1310' }, { name: 'Aganagar Union', postalCode: '1310' }]],
            ['Dhamrai', '1350', [{ name: 'Dhamrai Pourashava', postalCode: '1350' }]],
            ['Nawabganj', '1320'],
            ['Dohar', '1330'],
          ]),
        ],
      },
      {
        name: 'Gazipur',
        upazilas: [
          {
            name: 'Gazipur Sadar',
            areas: [
              { name: 'Joydebpur', postalCode: '1700' },
              { name: 'Tongi', postalCode: '1710' },
              { name: 'Konabari', postalCode: '1700' },
              { name: 'Board Bazar', postalCode: '1704' },
            ],
          },
          {
            name: 'Sreepur',
            areas: [
              { name: 'Sreepur Pourashava', postalCode: '1740' },
              { name: 'Mawna', postalCode: '1740' },
              { name: 'Telihati Union', postalCode: '1740' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Kaliakair', '1750', [{ name: 'Chandra', postalCode: '1750' }]],
            ['Kaliganj', '1720'],
            ['Kapasia', '1730'],
          ]),
        ],
      },
      {
        name: 'Narayanganj',
        upazilas: [
          {
            name: 'Narayanganj Sadar',
            areas: [
              { name: 'Chashara', postalCode: '1400' },
              { name: 'Fatullah', postalCode: '1420' },
              { name: 'Siddhirganj', postalCode: '1430' },
              { name: 'Kashipur Union', postalCode: '1421' },
            ],
          },
          {
            name: 'Rupganj',
            areas: [
              { name: 'Bhulta', postalCode: '1462' },
              { name: 'Purbachal Sector 1-10', postalCode: '1460' },
              { name: 'Tarabo Pourashava', postalCode: '1461' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Araihazar', '1450'],
            ['Bandar', '1410'],
            ['Sonargaon', '1440', [{ name: 'Mograpara Union', postalCode: '1441' }]],
          ]),
        ],
      },
      {
        name: 'Tangail',
        upazilas: [
          {
            name: 'Tangail Sadar',
            areas: [
              { name: 'Tangail Pourashava', postalCode: '1900' },
              { name: 'Santosh', postalCode: '1902' },
              { name: 'Gharinda Union', postalCode: '1900' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Basail', '1920'],
            ['Bhuapur', '1960'],
            ['Delduar', '1910'],
            ['Dhanbari', '1997'],
            ['Ghatail', '1980'],
            ['Gopalpur', '1990'],
            ['Kalihati', '1970', [{ name: 'Elenga', postalCode: '1974' }]],
            ['Madhupur', '1996'],
            ['Mirzapur', '1940'],
            ['Nagarpur', '1936'],
            ['Sakhipur', '1950'],
          ]),
        ],
      },
      {
        name: 'Kishoreganj',
        upazilas: buildStandardDistrictUpazilas([
          ['Kishoreganj Sadar', '2300', [{ name: 'Gourango Bazar', postalCode: '2300' }]],
          ['Austagram', '2380'],
          ['Bajitpur', '2336'],
          ['Bhairab', '2350'],
          ['Hossainpur', '2320'],
          ['Itna', '2390'],
          ['Karimganj', '2310'],
          ['Katiadi', '2330'],
          ['Kuliarchar', '2340'],
          ['Mithamain', '2370'],
          ['Nikli', '2360'],
          ['Pakundia', '2326'],
          ['Tarail', '2316'],
        ]),
      },
      {
        name: 'Manikganj',
        upazilas: buildStandardDistrictUpazilas([
          ['Manikganj Sadar', '1800'],
          ['Daulatpur', '1860'],
          ['Ghior', '1840'],
          ['Harirampur', '1830'],
          ['Saturia', '1810'],
          ['Shivalaya', '1850'],
          ['Singair', '1820'],
        ]),
      },
      {
        name: 'Munshiganj',
        upazilas: buildStandardDistrictUpazilas([
          ['Munshiganj Sadar', '1500'],
          ['Gazaria', '1510'],
          ['Lohajang', '1530'],
          ['Sirajdikhan', '1540'],
          ['Sreenagar', '1550'],
          ['Tongibari', '1520'],
        ]),
      },
      {
        name: 'Narsingdi',
        upazilas: buildStandardDistrictUpazilas([
          ['Narsingdi Sadar', '1600', [{ name: 'Madhabdi', postalCode: '1604' }]],
          ['Belabo', '1640'],
          ['Monohardi', '1650'],
          ['Palash', '1610'],
          ['Raipura', '1630'],
          ['Shibpur', '1620'],
        ]),
      },
      {
        name: 'Faridpur',
        upazilas: buildStandardDistrictUpazilas([
          ['Faridpur Sadar', '7800'],
          ['Alfadanga', '7870'],
          ['Bhanga', '7830'],
          ['Boalmari', '7860'],
          ['Charbhadrasan', '7810'],
          ['Madhukhali', '7850'],
          ['Nagarkanda', '7840'],
          ['Sadarpur', '7820'],
          ['Saltha', '7842'],
        ]),
      },
      {
        name: 'Gopalganj',
        upazilas: buildStandardDistrictUpazilas([
          ['Gopalganj Sadar', '8100'],
          ['Kashiani', '8130'],
          ['Kotalipara', '8110'],
          ['Muksudpur', '8140'],
          ['Tungipara', '8120'],
        ]),
      },
      {
        name: 'Madaripur',
        upazilas: buildStandardDistrictUpazilas([
          ['Madaripur Sadar', '7900'],
          ['Dasar', '7921'],
          ['Kalkini', '7920'],
          ['Rajoir', '7910'],
          ['Shibchar', '7930'],
        ]),
      },
      {
        name: 'Rajbari',
        upazilas: buildStandardDistrictUpazilas([
          ['Rajbari Sadar', '7700'],
          ['Baliakandi', '7730'],
          ['Goalanda', '7710'],
          ['Kalukhali', '7722'],
          ['Pangsha', '7720'],
        ]),
      },
      {
        name: 'Shariatpur',
        upazilas: buildStandardDistrictUpazilas([
          ['Shariatpur Sadar', '8000'],
          ['Bhedarganj', '8030'],
          ['Damudya', '8040'],
          ['Gosairhat', '8050'],
          ['Naria', '8020'],
          ['Zajira', '8010'],
        ]),
      },
    ],
  },
  {
    name: 'Chattogram',
    districts: [
      {
        name: 'Chattogram',
        upazilas: [
          {
            name: 'Panchlaish',
            areas: [
              { name: 'GEC Circle', postalCode: '4000' },
              { name: 'Nasirabad', postalCode: '4000' },
              { name: 'Muradpur', postalCode: '4000' },
              { name: 'Chawkbazar', postalCode: '4203' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '4000' },
            ],
          },
          {
            name: 'Kotwali',
            areas: [
              { name: 'Agrabad', postalCode: '4100' },
              { name: 'New Market', postalCode: '4000' },
              { name: 'Jamal Khan', postalCode: '4000' },
              { name: 'Anderkilla', postalCode: '4000' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '4000' },
            ],
          },
          {
            name: 'Halishahar',
            areas: [
              { name: 'Halishahar Housing Estate', postalCode: '4216' },
              { name: 'Pahartali', postalCode: '4202' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '4216' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Double Mooring', '4100', [{ name: 'Agrabad Commercial Area', postalCode: '4100' }]],
            ['Patenga', '4204'],
            ['Bayezid', '4210'],
            ['Chandgaon', '4212'],
            ['Bakalia', '4000'],
            ['Hathazari', '4330'],
            ['Sitakunda', '4310'],
            ['Mirsharai', '4320'],
            ['Patiya', '4370'],
            ['Boalkhali', '4366'],
            ['Anwara', '4376'],
            ['Rangunia', '4360'],
            ['Raozan', '4340'],
            ['Fatikchhari', '4350'],
            ['Banshkhali', '4390'],
            ['Satkania', '4386'],
            ['Lohagara', '4396'],
            ['Chandanaish', '4380'],
            ['Sandwip', '4300'],
            ['Karnaphuli', '4377'],
          ]),
        ],
      },
      {
        name: "Cox's Bazar",
        upazilas: [
          {
            name: "Cox's Bazar Sadar",
            areas: [
              { name: 'Kolatoli', postalCode: '4700' },
              { name: 'Sugandha Point', postalCode: '4700' },
              { name: 'Link Road', postalCode: '4700' },
              { name: "Cox's Bazar Pourashava", postalCode: '4700' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Chakaria', '4740'],
            ['Eidgaon', '4702'],
            ['Kutubdia', '4720'],
            ['Maheshkhali', '4710'],
            ['Pekua', '4745'],
            ['Ramu', '4730'],
            ['Teknaf', '4760'],
            ['Ukhiya', '4750'],
          ]),
        ],
      },
      {
        name: 'Cumilla',
        upazilas: [
          {
            name: 'Cumilla Adarsha Sadar',
            areas: [
              { name: 'Kandirpar', postalCode: '3500' },
              { name: 'Ranir Bazar', postalCode: '3500' },
              { name: 'Tomsom Bridge', postalCode: '3500' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Cumilla Sadar Dakshin', '3500'],
            ['Barura', '3560'],
            ['Brahmanpara', '3526'],
            ['Burichang', '3520'],
            ['Chandina', '3510'],
            ['Chauddagram', '3550'],
            ['Daudkandi', '3516'],
            ['Debidwar', '3530'],
            ['Homna', '3546'],
            ['Laksam', '3570'],
            ['Lalmai', '3502'],
            ['Meghna', '3515'],
            ['Monohorgonj', '3575'],
            ['Muradnagar', '3540'],
            ['Nangalkot', '3580'],
            ['Titas', '3542'],
          ]),
        ],
      },
      {
        name: 'Brahmanbaria',
        upazilas: buildStandardDistrictUpazilas([
          ['Brahmanbaria Sadar', '3400'],
          ['Akhaura', '3450'],
          ['Ashuganj', '3402'],
          ['Bancharampur', '3420'],
          ['Bijoynagar', '3406'],
          ['Kasba', '3460'],
          ['Nabinagar', '3410'],
          ['Nasirnagar', '3440'],
          ['Sarail', '3430'],
        ]),
      },
      {
        name: 'Chandpur',
        upazilas: buildStandardDistrictUpazilas([
          ['Chandpur Sadar', '3600'],
          ['Faridganj', '3650'],
          ['Haimchar', '3660'],
          ['Haziganj', '3610'],
          ['Kachua', '3630'],
          ['Matlab Dakshin', '3640'],
          ['Matlab Uttar', '3644'],
          ['Shahrasti', '3620'],
        ]),
      },
      {
        name: 'Feni',
        upazilas: buildStandardDistrictUpazilas([
          ['Feni Sadar', '3900'],
          ['Chhagalnaiya', '3910'],
          ['Daganbhuiyan', '3920'],
          ['Fulgazi', '3942'],
          ['Parshuram', '3940'],
          ['Sonagazi', '3930'],
        ]),
      },
      {
        name: 'Lakshmipur',
        upazilas: buildStandardDistrictUpazilas([
          ['Lakshmipur Sadar', '3700'],
          ['Kamalnagar', '3731'],
          ['Raipur', '3710'],
          ['Ramganj', '3720'],
          ['Ramgati', '3730'],
        ]),
      },
      {
        name: 'Noakhali',
        upazilas: buildStandardDistrictUpazilas([
          ['Noakhali Sadar', '3800', [{ name: 'Maijdee Court', postalCode: '3800' }]],
          ['Begumganj', '3820', [{ name: 'Chowmuhani', postalCode: '3821' }]],
          ['Chatkhil', '3870'],
          ['Companiganj', '3850'],
          ['Hatiya', '3890'],
          ['Kabirhat', '3807'],
          ['Senbagh', '3860'],
          ['Sonaimuri', '3827'],
          ['Subarnachar', '3813'],
        ]),
      },
      {
        name: 'Khagrachhari',
        upazilas: buildStandardDistrictUpazilas([
          ['Khagrachhari Sadar', '4400'],
          ['Dighinala', '4420'],
          ['Guimara', '4441'],
          ['Lakshmichhari', '4470'],
          ['Mahalchhari', '4430'],
          ['Manikchhari', '4460'],
          ['Matiranga', '4450'],
          ['Panchhari', '4410'],
          ['Ramgarh', '4440'],
        ]),
      },
      {
        name: 'Rangamati',
        upazilas: buildStandardDistrictUpazilas([
          ['Rangamati Sadar', '4500'],
          ['Baghaichhari', '4590'],
          ['Barkal', '4570'],
          ['Belaichhari', '4550'],
          ['Juraichhari', '4560'],
          ['Kaptai', '4530'],
          ['Kawkhali', '4510'],
          ['Langadu', '4580'],
          ['Naniarchar', '4520'],
          ['Rajasthali', '4540'],
        ]),
      },
      {
        name: 'Bandarban',
        upazilas: buildStandardDistrictUpazilas([
          ['Bandarban Sadar', '4600'],
          ['Alikadam', '4650'],
          ['Lama', '4641'],
          ['Naikhongchhari', '4660'],
          ['Rowangchhari', '4610'],
          ['Ruma', '4620'],
          ['Thanchi', '4630'],
        ]),
      },
    ],
  },
  {
    name: 'Rajshahi',
    districts: [
      {
        name: 'Rajshahi',
        upazilas: [
          {
            name: 'Boalia',
            areas: [
              { name: 'Shaheb Bazar', postalCode: '6100' },
              { name: 'Uposhohor', postalCode: '6202' },
              { name: 'Padma Residential', postalCode: '6207' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '6100' },
            ],
          },
          {
            name: 'Motihar',
            areas: [
              { name: 'Binodpur', postalCode: '6206' },
              { name: 'Kazla', postalCode: '6204' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '6204' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Rajpara', '6000'],
            ['Shah Makhdum', '6203'],
            ['Paba', '6210'],
            ['Bagha', '6280'],
            ['Bagmara', '6250'],
            ['Charghat', '6270'],
            ['Durgapur', '6240'],
            ['Godagari', '6290'],
            ['Mohanpur', '6220'],
            ['Puthia', '6260'],
            ['Tanore', '6230'],
          ]),
        ],
      },
      {
        name: 'Bogura',
        upazilas: [
          {
            name: 'Bogura Sadar',
            areas: [
              { name: 'Satmatha', postalCode: '5800' },
              { name: 'Jaleswaritola', postalCode: '5800' },
              { name: 'Bogura Pourashava', postalCode: '5800' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Adamdighi', '5890'],
            ['Dhunat', '5850'],
            ['Dhupchanchia', '5880'],
            ['Gabtali', '5820'],
            ['Kahaloo', '5870'],
            ['Nandigram', '5860'],
            ['Sariakandi', '5830'],
            ['Shajahanpur', '5801'],
            ['Sherpur', '5840'],
            ['Shibganj', '5810'],
            ['Sonatala', '5826'],
          ]),
        ],
      },
      {
        name: 'Chapainawabganj',
        upazilas: buildStandardDistrictUpazilas([
          ['Chapainawabganj Sadar', '6300'],
          ['Bholahat', '6330'],
          ['Gomastapur', '6320'],
          ['Nachole', '6310'],
          ['Shibganj', '6340'],
        ]),
      },
      {
        name: 'Joypurhat',
        upazilas: buildStandardDistrictUpazilas([
          ['Joypurhat Sadar', '5900'],
          ['Akkelpur', '5940'],
          ['Kalai', '5930'],
          ['Khetlal', '5920'],
          ['Panchbibi', '5910'],
        ]),
      },
      {
        name: 'Naogaon',
        upazilas: buildStandardDistrictUpazilas([
          ['Naogaon Sadar', '6500'],
          ['Atrai', '6596'],
          ['Badalgachhi', '6570'],
          ['Dhamoirhat', '6580'],
          ['Manda', '6510'],
          ['Mahadebpur', '6530'],
          ['Niamatpur', '6520'],
          ['Patnitala', '6540'],
          ['Porsha', '6550'],
          ['Raninagar', '6590'],
          ['Sapahar', '6560'],
        ]),
      },
      {
        name: 'Natore',
        upazilas: buildStandardDistrictUpazilas([
          ['Natore Sadar', '6400'],
          ['Bagatipara', '6410'],
          ['Baraigram', '6430'],
          ['Gurudaspur', '6440'],
          ['Lalpur', '6420'],
          ['Naldanga', '6402'],
          ['Singra', '6450'],
        ]),
      },
      {
        name: 'Pabna',
        upazilas: buildStandardDistrictUpazilas([
          ['Pabna Sadar', '6600'],
          ['Atgharia', '6610'],
          ['Bera', '6680'],
          ['Bhangura', '6640'],
          ['Chatmohar', '6630'],
          ['Faridpur', '6650'],
          ['Ishwardi', '6620'],
          ['Santhia', '6670'],
          ['Sujanagar', '6660'],
        ]),
      },
      {
        name: 'Sirajganj',
        upazilas: buildStandardDistrictUpazilas([
          ['Sirajganj Sadar', '6700'],
          ['Belkuchi', '6740'],
          ['Chauhali', '6750'],
          ['Kamarkhanda', '6730'],
          ['Kazipur', '6710'],
          ['Raiganj', '6720'],
          ['Shahjadpur', '6770'],
          ['Tarash', '6780'],
          ['Ullahpara', '6760'],
        ]),
      },
    ],
  },
  {
    name: 'Khulna',
    districts: [
      {
        name: 'Khulna',
        upazilas: [
          {
            name: 'Sonadanga',
            areas: [
              { name: 'Sonadanga Residential', postalCode: '9100' },
              { name: 'Nirala', postalCode: '9100' },
              { name: 'Gollamari', postalCode: '9100' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '9100' },
            ],
          },
          {
            name: 'Khalishpur',
            areas: [
              { name: 'Khalishpur Housing', postalCode: '9000' },
              { name: 'Daulatpur', postalCode: '9202' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '9000' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Khulna Sadar', '9100', [{ name: 'Shib Bari More', postalCode: '9100' }]],
            ['Daulatpur', '9202'],
            ['Khan Jahan Ali', '9204'],
            ['Batiaghata', '9260'],
            ['Dacope', '9270'],
            ['Dighalia', '9220'],
            ['Dumuria', '9250'],
            ['Koyra', '9290'],
            ['Paikgachha', '9280'],
            ['Phultala', '9210'],
            ['Rupsha', '9240'],
            ['Terokhada', '9230'],
          ]),
        ],
      },
      {
        name: 'Jashore',
        upazilas: [
          {
            name: 'Jashore Sadar',
            areas: [
              { name: 'Doratana', postalCode: '7400' },
              { name: 'Arabpur', postalCode: '7400' },
              { name: 'Jashore Pourashava', postalCode: '7400' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Abhaynagar', '7460', [{ name: 'Noapara', postalCode: '7460' }]],
            ['Bagherpara', '7470'],
            ['Chaugachha', '7410'],
            ['Jhikargachha', '7420'],
            ['Keshabpur', '7450'],
            ['Manirampur', '7440'],
            ['Sharsha', '7430', [{ name: 'Benapole', postalCode: '7431' }]],
          ]),
        ],
      },
      {
        name: 'Bagerhat',
        upazilas: buildStandardDistrictUpazilas([
          ['Bagerhat Sadar', '9300'],
          ['Chitalmari', '9360'],
          ['Fakirhat', '9370'],
          ['Kachua', '9310'],
          ['Mollahat', '9380'],
          ['Mongla', '9350'],
          ['Morrelganj', '9320'],
          ['Rampal', '9340'],
          ['Sarankhola', '9330'],
        ]),
      },
      {
        name: 'Chuadanga',
        upazilas: buildStandardDistrictUpazilas([
          ['Chuadanga Sadar', '7200'],
          ['Alamdanga', '7210'],
          ['Damurhuda', '7220'],
          ['Jibannagar', '7230'],
        ]),
      },
      {
        name: 'Jhenaidah',
        upazilas: buildStandardDistrictUpazilas([
          ['Jhenaidah Sadar', '7300'],
          ['Harinakunda', '7310'],
          ['Kaliganj', '7350'],
          ['Kotchandpur', '7330'],
          ['Maheshpur', '7340'],
          ['Shailkupa', '7320'],
        ]),
      },
      {
        name: 'Kushtia',
        upazilas: buildStandardDistrictUpazilas([
          ['Kushtia Sadar', '7000', [{ name: 'Mazampur', postalCode: '7000' }]],
          ['Bheramara', '7040'],
          ['Daulatpur', '7050'],
          ['Khoksa', '7020'],
          ['Kumarkhali', '7010'],
          ['Mirpur', '7030'],
        ]),
      },
      {
        name: 'Magura',
        upazilas: buildStandardDistrictUpazilas([
          ['Magura Sadar', '7600'],
          ['Mohammadpur', '7630'],
          ['Shalikha', '7620'],
          ['Sreepur', '7610'],
        ]),
      },
      {
        name: 'Meherpur',
        upazilas: buildStandardDistrictUpazilas([
          ['Meherpur Sadar', '7100'],
          ['Gangni', '7110'],
          ['Mujibnagar', '7102'],
        ]),
      },
      {
        name: 'Narail',
        upazilas: buildStandardDistrictUpazilas([
          ['Narail Sadar', '7500'],
          ['Kalia', '7520'],
          ['Lohagara', '7510'],
        ]),
      },
      {
        name: 'Satkhira',
        upazilas: buildStandardDistrictUpazilas([
          ['Satkhira Sadar', '9400'],
          ['Assasuni', '9460'],
          ['Debhata', '9430'],
          ['Kalaroa', '9410'],
          ['Kaliganj', '9440'],
          ['Shyamnagar', '9450'],
          ['Tala', '9420'],
        ]),
      },
    ],
  },
  {
    name: 'Sylhet',
    districts: [
      {
        name: 'Sylhet',
        upazilas: [
          {
            name: 'Sylhet Sadar',
            areas: [
              { name: 'Zindabazar', postalCode: '3100' },
              { name: 'Amberkhana', postalCode: '3100' },
              { name: 'Shahjalal Upashahar', postalCode: '3100' },
              { name: 'Modina Market', postalCode: '3100' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '3100' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Balaganj', '3120'],
            ['Beanibazar', '3170'],
            ['Bishwanath', '3130'],
            ['Companiganj', '3140'],
            ['Dakshin Surma', '3100'],
            ['Fenchuganj', '3116'],
            ['Golapganj', '3160'],
            ['Gowainghat', '3150'],
            ['Jaintiapur', '3156'],
            ['Kanaighat', '3180'],
            ['Osmani Nagar', '3124'],
            ['Zakiganj', '3190'],
          ]),
        ],
      },
      {
        name: 'Moulvibazar',
        upazilas: [
          {
            name: 'Sreemangal',
            areas: [
              { name: 'Sreemangal Town', postalCode: '3210' },
              { name: 'Kalighat Road', postalCode: '3210' },
              { name: 'Sreemangal Union', postalCode: '3210' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Moulvibazar Sadar', '3200'],
            ['Barlekha', '3250'],
            ['Juri', '3251'],
            ['Kamalganj', '3220'],
            ['Kulaura', '3230'],
            ['Rajnagar', '3240'],
          ]),
        ],
      },
      {
        name: 'Habiganj',
        upazilas: buildStandardDistrictUpazilas([
          ['Habiganj Sadar', '3300'],
          ['Ajmiriganj', '3360'],
          ['Bahubal', '3310'],
          ['Baniyachong', '3350'],
          ['Chunarughat', '3320'],
          ['Lakhai', '3340'],
          ['Madhabpur', '3330'],
          ['Nabiganj', '3370'],
          ['Shayestaganj', '3301'],
        ]),
      },
      {
        name: 'Sunamganj',
        upazilas: buildStandardDistrictUpazilas([
          ['Sunamganj Sadar', '3000'],
          ['Bishwamvarpur', '3010'],
          ['Chhatak', '3080'],
          ['Dakshin Sunamganj', '3002'],
          ['Derai', '3040'],
          ['Dharmapasha', '3050'],
          ['Dowarabazar', '3070'],
          ['Jagannathpur', '3060'],
          ['Jamalganj', '3020'],
          ['Madhyanagar', '3056'],
          ['Sullah', '3046'],
          ['Tahirpur', '3030'],
        ]),
      },
    ],
  },
  {
    name: 'Barishal',
    districts: [
      {
        name: 'Barishal',
        upazilas: [
          {
            name: 'Barishal Sadar',
            areas: [
              { name: 'Sadar Road', postalCode: '8200' },
              { name: 'Nathullabad', postalCode: '8200' },
              { name: 'Rupatali', postalCode: '8207' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '8200' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Agailjhara', '8240'],
            ['Babuganj', '8210'],
            ['Bakerganj', '8280'],
            ['Banaripara', '8230'],
            ['Gaurnadi', '8220'],
            ['Hizla', '8260'],
            ['Mehendiganj', '8270'],
            ['Muladi', '8250'],
            ['Wazirpur', '8226'],
          ]),
        ],
      },
      {
        name: 'Barguna',
        upazilas: buildStandardDistrictUpazilas([
          ['Barguna Sadar', '8700'],
          ['Amtali', '8710'],
          ['Bamna', '8730'],
          ['Betagi', '8740'],
          ['Patharghata', '8720'],
          ['Taltali', '8712'],
        ]),
      },
      {
        name: 'Bhola',
        upazilas: buildStandardDistrictUpazilas([
          ['Bhola Sadar', '8300'],
          ['Borhanuddin', '8320'],
          ['Char Fasson', '8340'],
          ['Daulatkhan', '8310'],
          ['Lalmohan', '8330'],
          ['Manpura', '8332'],
          ['Tazumuddin', '8331'],
        ]),
      },
      {
        name: 'Jhalokathi',
        upazilas: buildStandardDistrictUpazilas([
          ['Jhalokathi Sadar', '8400'],
          ['Kathalia', '8430'],
          ['Nalchity', '8420'],
          ['Rajapur', '8410'],
        ]),
      },
      {
        name: 'Patuakhali',
        upazilas: buildStandardDistrictUpazilas([
          ['Patuakhali Sadar', '8600'],
          ['Bauphal', '8620'],
          ['Dashmina', '8630'],
          ['Dumki', '8602'],
          ['Galachipa', '8640'],
          ['Kalapara', '8650'],
          ['Mirzaganj', '8610'],
          ['Rangabali', '8642'],
        ]),
      },
      {
        name: 'Pirojpur',
        upazilas: buildStandardDistrictUpazilas([
          ['Pirojpur Sadar', '8500'],
          ['Bhandaria', '8550'],
          ['Kawkhali', '8510'],
          ['Mathbaria', '8560'],
          ['Nazirpur', '8540'],
          ['Nesarabad (Swarupkati)', '8520'],
          ['Zianagar (Indurkani)', '8502'],
        ]),
      },
    ],
  },
  {
    name: 'Rangpur',
    districts: [
      {
        name: 'Rangpur',
        upazilas: [
          {
            name: 'Rangpur Sadar',
            areas: [
              { name: 'Jahaj Company More', postalCode: '5400' },
              { name: 'Dhap', postalCode: '5400' },
              { name: 'Modern More', postalCode: '5402' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '5400' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Badarganj', '5430'],
            ['Gangachhara', '5410'],
            ['Kaunia', '5440'],
            ['Mithapukur', '5460'],
            ['Pirgachha', '5450'],
            ['Pirganj', '5470'],
            ['Taraganj', '5420'],
          ]),
        ],
      },
      {
        name: 'Dinajpur',
        upazilas: buildStandardDistrictUpazilas([
          ['Dinajpur Sadar', '5200'],
          ['Birampur', '5266'],
          ['Birganj', '5220'],
          ['Biral', '5210'],
          ['Bochaganj', '5216'],
          ['Chirirbandar', '5240'],
          ['Fulbari', '5260'],
          ['Ghoraghat', '5290'],
          ['Hakimpur', '5270', [{ name: 'Hili', postalCode: '5270' }]],
          ['Kaharole', '5226'],
          ['Khansama', '5230'],
          ['Nawabganj', '5280'],
          ['Parbatipur', '5250'],
        ]),
      },
      {
        name: 'Gaibandha',
        upazilas: buildStandardDistrictUpazilas([
          ['Gaibandha Sadar', '5700'],
          ['Fulchhari', '5760'],
          ['Gobindaganj', '5740'],
          ['Palashbari', '5730'],
          ['Sadullapur', '5710'],
          ['Sughatta', '5750'],
          ['Sundarganj', '5720'],
        ]),
      },
      {
        name: 'Kurigram',
        upazilas: buildStandardDistrictUpazilas([
          ['Kurigram Sadar', '5600'],
          ['Bhurungamari', '5670'],
          ['Char Rajibpur', '5650'],
          ['Chilmari', '5630'],
          ['Nageshwari', '5660'],
          ['Phulbari', '5680'],
          ['Rajarhat', '5610'],
          ['Raomari', '5640'],
          ['Ulipur', '5620'],
        ]),
      },
      {
        name: 'Lalmonirhat',
        upazilas: buildStandardDistrictUpazilas([
          ['Lalmonirhat Sadar', '5500'],
          ['Aditmari', '5510'],
          ['Hatibandha', '5530'],
          ['Kaliganj', '5520'],
          ['Patgram', '5540'],
        ]),
      },
      {
        name: 'Nilphamari',
        upazilas: buildStandardDistrictUpazilas([
          ['Nilphamari Sadar', '5300'],
          ['Dimla', '5350'],
          ['Domar', '5340'],
          ['Jaldhaka', '5330'],
          ['Kishoreganj', '5320'],
          ['Saidpur', '5310'],
        ]),
      },
      {
        name: 'Panchagarh',
        upazilas: buildStandardDistrictUpazilas([
          ['Panchagarh Sadar', '5000'],
          ['Atwari', '5040'],
          ['Boda', '5010'],
          ['Debiganj', '5020'],
          ['Tetulia', '5030'],
        ]),
      },
      {
        name: 'Thakurgaon',
        upazilas: buildStandardDistrictUpazilas([
          ['Thakurgaon Sadar', '5100'],
          ['Baliadangi', '5140'],
          ['Haripur', '5130'],
          ['Pirganj', '5110'],
          ['Ranisankail', '5120'],
        ]),
      },
    ],
  },
  {
    name: 'Mymensingh',
    districts: [
      {
        name: 'Mymensingh',
        upazilas: [
          {
            name: 'Mymensingh Sadar',
            areas: [
              { name: 'Ganginar Par', postalCode: '2200' },
              { name: 'Charpara', postalCode: '2200' },
              { name: 'Maskanda', postalCode: '2200' },
              { name: 'Pourashava / Urban Area (Union N/A)', postalCode: '2200' },
            ],
          },
          ...buildStandardDistrictUpazilas([
            ['Bhaluka', '2240'],
            ['Dhobaura', '2250'],
            ['Fulbaria', '2216'],
            ['Gafargaon', '2230'],
            ['Gauripur', '2270'],
            ['Haluaghat', '2260'],
            ['Ishwarganj', '2280'],
            ['Muktagachha', '2210'],
            ['Nandail', '2290'],
            ['Phulpur', '2250'],
            ['Tara Khanda', '2252'],
            ['Trishal', '2220'],
          ]),
        ],
      },
      {
        name: 'Jamalpur',
        upazilas: buildStandardDistrictUpazilas([
          ['Jamalpur Sadar', '2000'],
          ['Baksiganj', '2040'],
          ['Dewanganj', '2030'],
          ['Islampur', '2020'],
          ['Madarganj', '2050'],
          ['Melandaha', '2010'],
          ['Sarishabari', '2050'],
        ]),
      },
      {
        name: 'Netrokona',
        upazilas: buildStandardDistrictUpazilas([
          ['Netrokona Sadar', '2400'],
          ['Atpara', '2470'],
          ['Barhatta', '2440'],
          ['Durgapur', '2420'],
          ['Kalmakanda', '2430'],
          ['Kendua', '2480'],
          ['Khaliajuri', '2460'],
          ['Madan', '2490'],
          ['Mohanganj', '2446'],
          ['Purbadhala', '2410'],
        ]),
      },
      {
        name: 'Sherpur',
        upazilas: buildStandardDistrictUpazilas([
          ['Sherpur Sadar', '2100'],
          ['Jhenaigati', '2120'],
          ['Nakla', '2150'],
          ['Nalitabari', '2110'],
          ['Sreebardi', '2130'],
        ]),
      },
    ],
  },
];

export function getDivisionNames(): string[] {
  return BD_DIVISIONS.map((d) => d.name);
}

export function getDistrictsForDivision(divisionName: string): BdDistrict[] {
  const div = BD_DIVISIONS.find((d) => d.name === divisionName);
  return div ? div.districts : [];
}

export function getUpazilasForDistrict(divisionName: string, districtName: string): BdUpazila[] {
  const districts = getDistrictsForDivision(divisionName);
  const dist = districts.find((d) => d.name === districtName);
  return dist ? dist.upazilas : [];
}

export function getAreasForUpazila(
  divisionName: string,
  districtName: string,
  upazilaName: string,
): BdArea[] {
  const upazilas = getUpazilasForDistrict(divisionName, districtName);
  const upa = upazilas.find((u) => u.name === upazilaName);
  return upa ? upa.areas : [];
}

export function validateBangladeshAddressHierarchy(input: {
  division: string;
  district: string;
  upazila: string;
  area: string;
}): { valid: boolean; reason?: string } {
  const div = BD_DIVISIONS.find((d) => d.name === input.division);
  if (!div) {
    return { valid: false, reason: `Unknown division: ${input.division}` };
  }
  const dist = div.districts.find((d) => d.name === input.district);
  if (!dist) {
    return { valid: false, reason: `District "${input.district}" does not belong to ${input.division}` };
  }
  const upa = dist.upazilas.find((u) => u.name === input.upazila);
  if (!upa) {
    return { valid: false, reason: `Upazila/Thana "${input.upazila}" does not belong to ${input.district}` };
  }
  const area = upa.areas.find((a) => a.name === input.area);
  if (!area) {
    return { valid: false, reason: `Area/Union "${input.area}" does not belong to ${input.upazila}` };
  }
  return { valid: true };
}

export interface ShippingConfig {
  dhakaMetroCharge: number;
  dhakaSuburbCharge: number;
  nationwideCharge: number;
  freeShippingThreshold: number;
  expressSurcharge: number;
}

export interface DeliveryZoneConfig {
  name: string;
  divisions: string[];
  charge: number;
  freeAbove: number;
  estimatedDays: string;
  isActive: boolean;
}

export interface DeliveryOptionSpec {
  code: string;
  name: string;
  description: string;
  estimatedTime: string;
  methodType: 'standard' | 'express';
  surcharge: number;
  freeShippingEligible: boolean;
  isActive: boolean;
  sortOrder: number;
  divisions?: string[];
}

export const DEFAULT_DELIVERY_OPTIONS: DeliveryOptionSpec[] = [
  {
    code: 'standard',
    name: 'Standard Delivery',
    description: 'Doorstep parcel courier across Bangladesh',
    estimatedTime: 'Within 2–5 Business Days',
    methodType: 'standard',
    surcharge: 0,
    freeShippingEligible: true,
    isActive: true,
    sortOrder: 0,
    divisions: ['All'],
  },
  {
    code: 'express',
    name: 'Priority Express',
    description: 'Accelerated dispatch & priority courier handling',
    estimatedTime: 'Within 1–2 Business Days',
    methodType: 'express',
    surcharge: 80,
    freeShippingEligible: false,
    isActive: true,
    sortOrder: 1,
    divisions: ['All'],
  },
];

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  dhakaMetroCharge: 60,
  dhakaSuburbCharge: 90,
  nationwideCharge: 120,
  freeShippingThreshold: 999,
  expressSurcharge: 80,
};

export function calculateShippingCharge(params: {
  division: string;
  district: string;
  upazila: string;
  subtotal: number;
  deliveryMethod?: 'standard' | 'express';
  deliveryOptionCode?: string;
  deliveryOptions?: DeliveryOptionSpec[];
  config?: Partial<ShippingConfig>;
  deliveryZones?: DeliveryZoneConfig[];
}): {
  charge: number;
  freeShippingApplied: boolean;
  zone: 'dhaka_metro' | 'dhaka_suburb' | 'nationwide';
  zoneName?: string;
  estimatedDays: string;
  deliveryOptionCode: string;
  deliveryMethodName: string;
} {
  const cfg: ShippingConfig = { ...DEFAULT_SHIPPING_CONFIG, ...params.config };
  const isDhakaDistrict = params.division === 'Dhaka' && params.district === 'Dhaka';
  const isSavar = isDhakaDistrict && params.upazila === 'Savar';

  let zone: 'dhaka_metro' | 'dhaka_suburb' | 'nationwide' = 'nationwide';
  let baseCharge = cfg.nationwideCharge;
  let estimatedDays = 'Within 2–5 Business Days';
  let effectiveThreshold = cfg.freeShippingThreshold;
  let zoneName: string | undefined;

  if (!params.division || (isDhakaDistrict && !isSavar)) {
    zone = 'dhaka_metro';
    baseCharge = cfg.dhakaMetroCharge;
    estimatedDays = 'Within 1–2 Business Days';
  } else if (
    isSavar ||
    (params.division === 'Dhaka' && (params.district === 'Gazipur' || params.district === 'Narayanganj'))
  ) {
    zone = 'dhaka_suburb';
    baseCharge = cfg.dhakaSuburbCharge;
    estimatedDays = 'Within 2–3 Business Days';
  }

  const normalizedDivision = (params.division || '').trim().toLowerCase();
  const matchedZone = normalizedDivision
    ? (params.deliveryZones || []).find(
        (z) =>
          z &&
          z.isActive !== false &&
          Array.isArray(z.divisions) &&
          z.divisions.some((d) => {
            const clean = d.trim().toLowerCase();
            return clean === normalizedDivision || clean === 'all';
          }),
      )
    : undefined;

  if (matchedZone) {
    baseCharge = Math.max(0, Number(matchedZone.charge) || 0);
    if (matchedZone.estimatedDays?.trim()) {
      estimatedDays = matchedZone.estimatedDays.trim();
    }
    if (Number(matchedZone.freeAbove) > 0) {
      effectiveThreshold = Number(matchedZone.freeAbove);
    }
    if (matchedZone.name?.trim()) {
      zoneName = matchedZone.name.trim();
    }
  }

  const configuredOptions =
    Array.isArray(params.deliveryOptions) && params.deliveryOptions.length > 0
      ? params.deliveryOptions
      : DEFAULT_DELIVERY_OPTIONS;

  const requestedCode =
    params.deliveryOptionCode || (params.deliveryMethod === 'express' ? 'express' : 'standard');

  const selectedOption =
    configuredOptions.find((o) => o.isActive !== false && o.code === requestedCode) ||
    configuredOptions.find((o) => o.isActive !== false) ||
    DEFAULT_DELIVERY_OPTIONS[0];

  const isExpress =
    params.deliveryMethod === 'express' || selectedOption.methodType === 'express' || selectedOption.code === 'express';

  const thresholdEligible = effectiveThreshold > 0 && params.subtotal >= effectiveThreshold;
  const freeShippingApplied = thresholdEligible && (selectedOption.freeShippingEligible !== false || !isExpress);

  let charge = thresholdEligible && selectedOption.freeShippingEligible !== false ? 0 : baseCharge;
  if (isExpress) {
    const expressAddOn =
      params.deliveryOptionCode && selectedOption.surcharge >= 0
        ? selectedOption.surcharge || cfg.expressSurcharge
        : cfg.expressSurcharge;
    if (thresholdEligible) {
      charge = expressAddOn;
    } else {
      charge = baseCharge + expressAddOn;
    }
    estimatedDays =
      selectedOption.estimatedTime?.trim() ||
      (zone === 'dhaka_metro' ? 'Same day / Next day' : '1-2 business days');
  } else if (selectedOption.surcharge > 0) {
    charge += selectedOption.surcharge;
  }

  return {
    charge: Math.max(0, Math.round(charge)),
    freeShippingApplied,
    zone,
    ...(zoneName ? { zoneName } : {}),
    estimatedDays:
      selectedOption.code !== 'standard' && selectedOption.estimatedTime?.trim()
        ? selectedOption.estimatedTime.trim()
        : matchedZone?.estimatedDays?.trim() || selectedOption.estimatedTime?.trim() || estimatedDays,
    deliveryOptionCode: selectedOption.code,
    deliveryMethodName: selectedOption.name,
  };
}

export function buildAvailableDeliveryOptions(params: {
  division: string;
  district: string;
  upazila: string;
  subtotal: number;
  config?: Partial<ShippingConfig>;
  deliveryZones?: DeliveryZoneConfig[];
  deliveryOptions?: DeliveryOptionSpec[];
}) {
  const configured =
    Array.isArray(params.deliveryOptions) && params.deliveryOptions.length > 0
      ? params.deliveryOptions
      : DEFAULT_DELIVERY_OPTIONS;

  const normalizedDivision = (params.division || '').trim().toLowerCase();

  return configured
    .filter((opt) => opt && opt.isActive !== false)
    .filter((opt) => {
      if (!normalizedDivision || !opt.divisions || opt.divisions.length === 0) return true;
      return opt.divisions.some((d) => {
        const clean = d.trim().toLowerCase();
        return clean === 'all' || clean === normalizedDivision;
      });
    })
    .slice()
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    .map((opt) => {
      const calc = calculateShippingCharge({
        division: params.division,
        district: params.district,
        upazila: params.upazila,
        subtotal: params.subtotal,
        deliveryMethod: opt.methodType === 'express' ? 'express' : 'standard',
        deliveryOptionCode: opt.code,
        deliveryOptions: configured,
        config: params.config,
        deliveryZones: params.deliveryZones,
      });
      return {
        code: opt.code,
        name: opt.name,
        description: opt.description,
        methodType: opt.methodType,
        estimatedTime: calc.estimatedDays,
        charge: calc.charge,
        freeShippingApplied: calc.freeShippingApplied,
        zone: calc.zone,
        zoneName: calc.zoneName,
      };
    });
}
