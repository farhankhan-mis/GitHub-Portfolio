// Rule-based classification of public job-feed postings into the catalog's taxonomy.
// Every rule is a plain regular expression so results are explainable and testable.

const EARLY_CAREER = /\b(intern(ship)?s?|externship|co-?op|new[\s-]?grad(uate)?s?|graduate\s+(program|analyst|engineer|associate|trainee|scheme)|early[\s-]career|entry[\s-]level|apprentice(ship)?s?|fellow(ship)?s?|university\s+(grad(uate)?|hire|program)|campus|student|summer\s+(analyst|associate|scholar)|rotational|junior|pre-?employment training)\b/i;
const SENIOR = /\b(senior|sr\.?|staff|principal|lead|manager|director|head of|vp|vice president|chief|recruit(er|ing)|supervisor|architect)\b/i;
const NOT_A_POSTING = /expression of interest|future opportunit|talent (pool|community|network)|general (application|interest)|evergreen|don'?t see|join our talent|interest form/i;

export function isEarlyCareer(title) {
  return EARLY_CAREER.test(title) && !SENIOR.test(title) && !NOT_A_POSTING.test(title);
}

export function opportunityType(title, employmentType = '') {
  const t = `${title}`;
  if (/\bco-?op\b/i.test(t)) return 'Co-op';
  if (/\bapprentice/i.test(t)) return 'Apprenticeship';
  if (/\b(intern(ship)?s?|externship|summer\s+(analyst|associate|scholar))\b/i.test(t)) return 'Internship';
  if (/\bfellow(ship)?s?\b/i.test(t)) return 'Fellowship';
  if (/\bpart[\s-]time\b|student worker/i.test(t) || /part[\s-]?time/i.test(employmentType)) return 'Part-time job';
  if (/\b(contract|temporary|seasonal)\b/i.test(t) || /contract|temporary|temp\b/i.test(employmentType)) return 'Contract role';
  return 'Entry-level job';
}

export function scheduleType(title, employmentType = '') {
  const t = `${title} ${employmentType}`;
  if (/part[\s-]?time/i.test(t)) return 'Part-time';
  if (/full[\s-]?time/i.test(t)) return 'Full-time';
  return 'Not listed';
}

export function term(title, type) {
  const m = title.match(/\b(spring|summer|fall|autumn|winter)\b[\s,/-]*(?:and\s+\w+\s+)?(20\d\d)?/i);
  const y = title.match(/\b(20\d\d)\b/);
  if (m) {
    const season = m[1].toLowerCase() === 'autumn' ? 'Fall' : m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    const year = m[2] || (y ? y[1] : '');
    return year ? `${season} ${year}` : season;
  }
  if (['Entry-level job', 'Full-time job', 'Part-time job'].includes(type)) return 'Year-round';
  return y ? y[1] : null;
}

// [pattern tested against "title | department", role_key, field_key]. First match wins, so order matters.
const ROLE_RULES = [
  [/\b(nurse|nursing|rn\b|np\b|nurse practitioner|physician assistant)/i, 'Nursing', 'Healthcare & Clinical'],
  [/\bclinical research|clinical trial/i, 'Clinical Research', 'Healthcare & Clinical'],
  [/\b(pharmacy|pharmacist)/i, 'Pharmacy', 'Healthcare & Clinical'],
  [/\b(dvm|veterinar)/i, 'Veterinary Support', 'Agriculture, Food & Natural Resources'],
  [/\b(epidemiolog|public health)/i, 'Public Health Research', 'Public Health'],
  [/\b(bioinformatic|computational biolog)/i, 'Bioinformatics', 'Life Sciences & Biotechnology'],
  [/\b(genomic|genetic)/i, 'Genetics & Genomics', 'Life Sciences & Biotechnology'],
  [/\b(biotech|biolog|biochem|molecular|cell line|protein|assay|automation scientist)/i, 'Biotechnology', 'Life Sciences & Biotechnology'],
  [/\bchemist(ry)?\b/i, 'Chemistry Research', 'Physical Sciences'],
  [/\bphysic(s|ist)\b|\bplasma|fusion/i, 'Physics Research', 'Physical Sciences'],
  [/\b(ux|ui|user experience|product design|interaction design|visual design)/i, 'UX & UI Design', 'Arts, Design & Creative'],
  [/\b(animation|animator|rigging)/i, 'Animation', 'Arts, Design & Creative'],
  [/\b(graphic design|brand design|illustrat|concept art|\bart (intern|fellow)|artist|3d art|environment art)/i, 'Graphic Design', 'Arts, Design & Creative'],
  [/\b(photograph|videograph|video (editor|production))/i, 'Photography & Video', 'Arts, Design & Creative'],
  [/\b(industrial design)/i, 'Industrial Design', 'Arts, Design & Creative'],
  [/\b(user research|ux research)/i, 'User Research', 'Social & Behavioral Sciences'],
  [/\b(journalis|reporter|reporting|newsroom|investigations? fellow|correspondent)/i, 'Journalism', 'Media, Writing & Communications'],
  [/\b(editor(ial)?|copy ?edit|publishing)/i, 'Editing & Publishing', 'Media, Writing & Communications'],
  [/\b(podcast|audio producer)/i, 'Podcast & Audio', 'Media, Writing & Communications'],
  [/\b(broadcast|sports programming|production assistant|producer)/i, 'Broadcasting', 'Media, Writing & Communications'],
  [/\b(technical writ|documentation)/i, 'Technical Writing', 'Media, Writing & Communications'],
  [/\b(content (creator|enablement|strategy|marketing|producer)|social media|audience)/i, 'Content Creation', 'Media, Writing & Communications'],
  [/\b(communications?|public relations|\bpr\b|press)/i, 'Communications', 'Media, Writing & Communications'],
  [/\b(legal|law clerk|paralegal|counsel)/i, 'Corporate Legal', 'Law, Compliance & Public Safety'],
  [/\b(compliance|regulatory)/i, 'Compliance', 'Law, Compliance & Public Safety'],
  [/\b(privacy)/i, 'Privacy & Data Protection', 'Law, Compliance & Public Safety'],
  [/\b(trust (and|&) safety|investigat|fraud)/i, 'Security & Investigations', 'Law, Compliance & Public Safety'],
  [/\b(national security|foreign policy|international affairs)/i, 'Diplomacy & International Affairs', 'Government & Public Policy'],
  [/\b(policy|public affairs|government affairs)/i, 'Policy Analysis', 'Government & Public Policy'],
  [/\b(cyber|security|offensive security|appsec|infosec|detection engineer)/i, 'Cybersecurity', 'Technology & Computing'],
  [/\b(library|librarian|archiv)/i, 'Library & Information Science', 'Education'],
  [/\bsystems engineer/i, 'Industrial Engineering', 'Engineering'],
  [/\b(machine learning|\bml\b|deep learning|\bai\b|artificial intelligence|computer vision|nlp|llm|applied scientist|research scientist|autonomy|perception)/i, 'Artificial Intelligence & Machine Learning', 'Data, AI & Mathematics'],
  [/\b(data scien)/i, 'Data Science', 'Data, AI & Mathematics'],
  [/\b(data engineer|analytics engineer|data infra|data platform)/i, 'Data Engineering', 'Data, AI & Mathematics'],
  [/\b(business intelligence|\bbi\b)/i, 'Business Intelligence', 'Data, AI & Mathematics'],
  [/\b(quant(itative)?|actuar)/i, 'Statistics', 'Data, AI & Mathematics'],
  [/\b(data analy|analytics|insights)/i, 'Data Analysis', 'Data, AI & Mathematics'],
  [/\b(devops|site reliability|\bsre\b|cloud|infrastructure engineer|platform engineer|production engineer)/i, 'Cloud & DevOps', 'Technology & Computing'],
  [/\b(network engineer|networking)/i, 'Network Engineering', 'Technology & Computing'],
  [/\b(quality assurance|\bqa\b|software test|test automation|sdet)/i, 'Quality Assurance & Testing', 'Technology & Computing'],
  [/\b(it support|help ?desk|information technology)\b/i, 'IT Support', 'Technology & Computing'],
  [/\bIT\b/, 'IT Support', 'Technology & Computing'],
  [/\b(front[\s-]?end|web developer|web engineer|full[\s-]?stack)/i, 'Web Development', 'Technology & Computing'],
  [/\b(software|developer|programmer|swe\b|backend|back-end|mobile engineer|ios|android|forward deployed)/i, 'Software Engineering', 'Technology & Computing'],
  [/\b(technician|assembler|welder|machinist|cnc)/i, 'Maintenance Technician', 'Skilled Trades & Technical Services'],
  [/\b(aero|propulsion|flight|avionic|spacecraft|launch|aerodynamic|gnc|guidance)/i, 'Aerospace Engineering', 'Engineering'],
  [/\b(electrical|electronics|hardware|pcb|fpga|rf\b|antenna|power systems|embedded|firmware|asic|silicon)/i, 'Electrical Engineering', 'Engineering'],
  [/\b(robotic|mechatronic|automation engineer|controls)/i, 'Robotics & Automation', 'Engineering'],
  [/\b(mechanical|thermal|structures|structural analysis|design engineer)/i, 'Mechanical Engineering', 'Engineering'],
  [/\b(manufacturing|production engineer|additive|machining|process engineer)/i, 'Manufacturing Engineering', 'Engineering'],
  [/\b(materials|metallurg|composites)/i, 'Materials Engineering', 'Engineering'],
  [/\b(industrial engineer|operations research)/i, 'Industrial Engineering', 'Engineering'],
  [/\b(chemical engineer)/i, 'Chemical Engineering', 'Engineering'],
  [/\b(civil|geotechnical|transportation engineer)/i, 'Civil Engineering', 'Engineering'],
  [/\b(environmental engineer)/i, 'Environmental Engineering', 'Engineering'],
  [/\b(biomedical|medical device)/i, 'Biomedical Engineering', 'Engineering'],
  [/\b(construction management|construction)/i, 'Construction Management', 'Architecture, Construction & Real Estate'],
  [/\b(real estate|property management)/i, 'Real Estate', 'Architecture, Construction & Real Estate'],
  [/\b(supply chain|procurement|sourcing|purchasing)/i, 'Supply Chain', 'Transportation, Logistics & Supply Chain'],
  [/\b(logistic|warehouse|fulfillment)/i, 'Logistics', 'Transportation, Logistics & Supply Chain'],
  [/\b(sustainab|climate|carbon)/i, 'Sustainability', 'Environment & Sustainability'],
  [/\b(renewable|solar|wind|battery|energy)/i, 'Renewable Energy', 'Environment & Sustainability'],
  [/\b(product manag|\bapm\b|associate product|product intern|product growth)/i, 'Product Management', 'Business & Management'],
  [/\b(program manag|project manag|tpm)/i, 'Project & Program Management', 'Business & Management'],
  [/\b(people|human resources|\bhr\b|talent)/i, 'Human Resources', 'Business & Management'],
  [/\b(strategy|consult|deployment strategist|m&a advisory|advisory)/i, 'Consulting & Strategy', 'Business & Management'],
  [/\b(audit|assurance)/i, 'Audit & Assurance', 'Accounting & Finance'],
  [/\b(tax)\b/i, 'Tax', 'Accounting & Finance'],
  [/\b(accounting|accountant)/i, 'Accounting', 'Accounting & Finance'],
  [/\b(investment|investing|portfolio|trader|trading|asset management|equity research|researcher)/i, 'Investment Management', 'Accounting & Finance'],
  [/\b(banking|credit|lending)/i, 'Banking', 'Accounting & Finance'],
  [/\b(risk|insurance|underwrit)/i, 'Insurance & Risk', 'Accounting & Finance'],
  [/\b(corporate finance|fp&a|treasury|finance|financial)/i, 'Financial Analysis', 'Accounting & Finance'],
  [/\b(account (development|executive|manager)|sales|business development|\bsdr\b|\bbdr\b|partnerships)/i, 'Sales & Business Development', 'Sales, Marketing & Customer Experience'],
  [/\b(customer (success|experience|support)|support (analyst|specialist)|client service)/i, 'Customer Success', 'Sales, Marketing & Customer Experience'],
  [/\b(brand)/i, 'Brand Management', 'Sales, Marketing & Customer Experience'],
  [/\b(growth|performance marketing|digital marketing|seo|lifecycle)/i, 'Digital Marketing', 'Sales, Marketing & Customer Experience'],
  [/\b(market research)/i, 'Market Research', 'Sales, Marketing & Customer Experience'],
  [/\b(marketing)/i, 'Digital Marketing', 'Sales, Marketing & Customer Experience'],
  [/\b(teach|tutor|instruct|curriculum)/i, 'Teaching Assistant & Tutoring', 'Education'],
  [/\bbusiness analy/i, 'Business Analysis', 'Business & Management'],
  [/\b(data quality|product data|\bdata\b)/i, 'Data Analysis', 'Data, AI & Mathematics'],
];

// Generic words that only decide the category when the title, department and employer default say nothing more specific.
const WEAK_RULES = [
  [/\b(operations|ops\b)/i, 'Operations Management', 'Business & Management'],
  [/\banalyst\b/i, 'Business Analysis', 'Business & Management'],
  [/\bresearch/i, 'Behavioral Research', 'Social & Behavioral Sciences'],
  [/\b(engineer|engineering)\b/i, 'Software Engineering', 'Technology & Computing'],
];

export function classifyRole(title, department = '', fallback = null) {
  const hit = (rules, text) => text && rules.find(([re]) => re.test(text));
  const strongTitle = hit(ROLE_RULES, title);
  if (strongTitle) return { role_key: strongTitle[1], field_key: strongTitle[2], matched: 'title' };
  const strongDept = hit(ROLE_RULES, department);
  if (strongDept) return { role_key: strongDept[1], field_key: strongDept[2], matched: 'department' };
  if (fallback) return { ...fallback, matched: 'source default' };
  const weak = hit(WEAK_RULES, title) || hit(WEAK_RULES, department);
  if (weak) return { role_key: weak[1], field_key: weak[2], matched: 'generic word' };
  return { role_key: 'Business Analysis', field_key: 'Business & Management', matched: 'none' };
}

const STATES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };
const NAME_TO_CODE = Object.fromEntries(Object.entries(STATES).map(([code, name]) => [name.toLowerCase(), code]));
const CITY_TO_STATE = { 'new york city': 'NY', 'new york': 'NY', nyc: 'NY', manhattan: 'NY', brooklyn: 'NY', 'san francisco': 'CA', 'bay area': 'CA', 'los angeles': 'CA', 'mountain view': 'CA', 'palo alto': 'CA', 'menlo park': 'CA', 'san jose': 'CA', 'san mateo': 'CA', 'sunnyvale': 'CA', 'santa clara': 'CA', 'san diego': 'CA', 'irvine': 'CA', 'el segundo': 'CA', 'hawthorne': 'CA', 'long beach': 'CA', 'costa mesa': 'CA', 'oakland': 'CA', seattle: 'WA', bellevue: 'WA', redmond: 'WA', boston: 'MA', cambridge: 'MA', chicago: 'IL', austin: 'TX', dallas: 'TX', houston: 'TX', 'san antonio': 'TX', denver: 'CO', boulder: 'CO', atlanta: 'GA', miami: 'FL', orlando: 'FL', tampa: 'FL', philadelphia: 'PA', pittsburgh: 'PA', 'washington, d.c.': 'DC', 'washington dc': 'DC', 'washington d.c.': 'DC', 'district of columbia': 'DC', arlington: 'VA', 'salt lake city': 'UT', phoenix: 'AZ', portland: 'OR', minneapolis: 'MN', detroit: 'MI', 'ann arbor': 'MI', raleigh: 'NC', durham: 'NC', charlotte: 'NC', nashville: 'TN', columbus: 'OH', baltimore: 'MD' };
const NON_US = /\b(canada|toronto|montreal|vancouver|ontario|quebec|united kingdom|\buk\b|london|england|ireland|dublin|germany|berlin|munich|france|paris|spain|madrid|italy|netherlands|amsterdam|switzerland|zurich|poland|warsaw|serbia|belgrade|india|bangalore|bengaluru|hyderabad|pune|singapore|japan|tokyo|china|shanghai|beijing|hong kong|taiwan|korea|seoul|australia|sydney|melbourne|new zealand|brazil|sao paulo|mexico|argentina|chile|colombia|israel|tel aviv|uae|dubai|emea|apac|latam|europe|asia|malaysia|philippines|vietnam|indonesia|sweden|denmark|norway|finland|portugal|lisbon|czech|romania|ukraine|south africa|nigeria|kenya|egypt|turkey)\b/i;

function stateOf(part) {
  const p = part.trim();
  const code = p.match(/,\s*([A-Z]{2})\b(?!\w)/) || p.match(/^([A-Z]{2})$/) || p.match(/\b([A-Z]{2})\s+\d{5}/);
  if (code && STATES[code[1]]) return code[1];
  const lower = p.toLowerCase();
  for (const [name, c] of Object.entries(NAME_TO_CODE)) if (lower.includes(name) && !(name === 'washington' && /washington,? d\.?c|district of columbia/.test(lower))) return c;
  for (const [city, c] of Object.entries(CITY_TO_STATE)) if (lower.includes(city)) return c;
  return null;
}

// Returns { us, remote, states, cities, label } for a list of raw location strings.
export function parseLocations(rawList, remoteFlag = false) {
  const parts = rawList.flatMap((raw) => String(raw || '').split(/\s*(?:;|•|\||\n)\s*/)).map((s) => s.trim()).filter(Boolean);
  const remote = remoteFlag || parts.some((p) => /\bremote\b/i.test(p));
  const usParts = [];
  let nonUs = 0;
  for (const p of parts) {
    const st = stateOf(p);
    if (st) usParts.push({ raw: p, state: st });
    else if (NON_US.test(p)) nonUs++;
    else if (/\b(united states|usa|u\.s\.|\bus\b)/i.test(p)) usParts.push({ raw: p, state: null });
  }
  const remoteUS = remote && (parts.some((p) => /remote[\s,(-]*(us|usa|united states|u\.s\.)/i.test(p) || /^remote$/i.test(p)) || usParts.length > 0);
  if (!usParts.length && !remoteUS) return { us: false, reason: nonUs ? 'outside the US' : 'location unclear' };
  const states = [...new Set(usParts.map((p) => p.state).filter(Boolean))];
  const placeOf = (p) => {
    const city = p.raw.split(',')[0].replace(/^(hybrid|remote|on-?site)\s*[-–:]\s*/i, '').trim();
    if (!city || /^remote$/i.test(city)) return `Remote, ${p.state}`;
    return city.toLowerCase() === STATES[p.state].toLowerCase() || city === p.state ? STATES[p.state] : `${city}, ${p.state}`;
  };
  const places = [...new Set(usParts.filter((p) => p.state).map(placeOf))];
  const cities = places.map((place) => place.split(',')[0]);
  let label;
  if (!states.length) label = 'Remote (US)';
  else if (places.length <= 3) label = places.join('; ');
  else label = `Multiple locations (${places.length})`;
  if (remote && states.length) label += ' · Remote option';
  return { us: true, remote, states, cities, label };
}

export function workMode(rawText, workplaceType = '', remote = false) {
  const w = String(workplaceType).toLowerCase();
  if (w.includes('hybrid')) return 'Hybrid';
  if (w.includes('remote')) return 'Remote';
  if (w.includes('onsite') || w.includes('on-site') || w.includes('on_site')) return 'On-site';
  if (/hybrid/i.test(rawText)) return 'Hybrid';
  if (remote && !/,\s*[A-Z]{2}\b/.test(rawText)) return 'Remote';
  if (remote) return 'Remote/Hybrid';
  return 'On-site';
}
