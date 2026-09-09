import * as fs from 'fs';
import * as path from 'path';

export interface Holding {
  symbol: string;
  companyName: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  sector: string;
  investedValue: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  priceUnavailable?: boolean;
  source?: string;
}

export interface ParseResult {
  holdings: Holding[];
  source: string;
  totalInvested: number;
  errors: string[];
}

const ISIN_TO_SYMBOL: Record<string, string> = {
  'INE377Y01014': 'BAJAJHFL',
  'INE463A01038': 'BERGEPAINT',
  'INE128S01021': 'FIVESTAR',
  'INE887G01027': 'GOKALDAS',
  'INE221H01019': 'GTLINFRA',
  'INE202E01016': 'IREDA',
  'INE227G01018': 'INDOWIND',
  'INE962Y01021': 'IRCON',
  'INE763M01028': 'MERCURYEV',
  'INE415G01027': 'RVNL',
  'INE782X01033': 'SERVOTECH',
  'INE908D01010': 'SHAKTIPUMPS',
  'INE040H01021': 'SUZLON',
  'INE155A01022': 'TATAMOTORS',
  'INE758T01015': 'ZOMATO',
  'INE982J01020': 'PAYTM',
  'INE388Y01029': 'NYKAA',
  'INE417T01026': 'POLICYBZR',
  'INE148O01028': 'DELHIVERY',
  'INE0A6K01030': 'MAPMYINDIA',
  'INE00LK01028': 'IDEAFORGE',
  'INE918T01016': 'KAYNES',
  'INE0B4Y01016': 'SYRMA',
  'INE0D0H01015': 'AVALON',
  'INE905E01012': 'PENTAGOLD',
  'INE0G7901013': 'INOXGREEN',
  'INE0MG01013': 'WAAREE',
  'INE794B01026': 'PREMIER',
  'INE0K0B01011': 'EPIGRAL',
  'INE0N2X01017': 'JYOTCNC',
  'INE0BW801026': 'IXIGO',
  'INE596I01012': 'CAMS',
  'INE732I01013': 'ANGELONE',
  'INE0C6801018': 'RATEGAIN',
  'INE040A01034': 'HDFCBANK',
  'INE009A01021': 'INFY',
  'INE467B01029': 'TCS',
  'INE002A01018': 'RELIANCE',
  'INE090A01021': 'ICICIBANK',
  'INE238A01034': 'AXISBANK',
  'INE585B01010': 'BAJFINANCE',
  'INE021A01026': 'SBIN',
  'INE062A01020': 'WIPRO',
  'INE075A01022': 'SUNPHARMA',
  'INE397D01024': 'NAUKRI',
  'INE066A01021': 'ONGC',
  'INE101A01026': 'COALINDIA',
  'INE470A01017': 'NTPC',
  'INE752E01010': 'POWERGRID',
  'INE081A01012': 'NESTLEIND',
  'INE030A01027': 'BRITANNIA',
  'INE148A01028': 'TITAN',
  'INE364A01010': 'ASIANPAINT',
  'INE052A01021': 'LT',
  'INE397A01024': 'BHARTIARTL',
  'INE117A01022': 'MARUTI',
  'INE001A01036': 'HDFCLIFE',
  'INE726G01019': 'SBILIFE',
  'INE124G01033': 'DRREDDY',
  'INE059A01026': 'CIPLA',
  'INE406A01037': 'DIVISLAB',
  'INE318A01026': 'APOLLOHOSP',
  'INE742F01042': 'ADANIENT',
  'INE910H01017': 'ADANIPORTS',
  'INE503A01015': 'GRASIM',
  'INE481G01011': 'ULTRACEMCO',
  'INE019A01038': 'JSWSTEEL',
  'INE672A01018': 'TATASTEEL',
  'INE038A01020': 'HINDALCO',
  'INE860A01027': 'HCLTECH',
  'INE289B01019': 'TECHM',
  'INE885A01032': 'AMARAJABAT',
  'INE0FRK01020': 'MOTISONSJW',
  'INE053F01010': 'IRFC',
  'INE0S4R01014': 'CRIZAC',
  'INE848E01016': 'NHPC',
};

function nameToSymbol(name: string): string {
  const n = name.toUpperCase().trim();
  const nameMap: Record<string, string> = {
    'BAJAJ HOUSING FINANCE LTD': 'BAJAJHFL',
    'BERGER PAINTS (I) LTD': 'BERGEPAINT',
    'FIVE-STAR BUS FIN LTD': 'FIVESTAR',
    'GOKALDAS EXPORTS LTD.': 'GOKALDAS',
    'GOKALDAS EXPORTS': 'GOKALDAS',
    'GTL INFRA.LTD': 'GTLINFRA',
    'GTL INFRASTRUCTURE': 'GTLINFRA',
    'INDIAN RENEWABLE ENERGY': 'IREDA',
    'IREDA': 'IREDA',
    'INDOWIND ENERGY LTD': 'INDOWIND',
    'IRCON INTERNATIONAL LTD': 'IRCON',
    'MERCURY EV-TECH LIMITED': 'MERCURYEV',
    'MERCURY EV': 'MERCURYEV',
    'RAIL VIKAS NIGAM LIMITED': 'RVNL',
    'RAIL VIKAS NIGAM': 'RVNL',
    'RVNL': 'RVNL',
    'SERVOTECH REN POW SYS LTD': 'SERVOTECH',
    'SERVOTECH POWER': 'SERVOTECH',
    'SHAKTI PUMPS (I) LTD': 'SHAKTIPUMPS',
    'SHAKTI PUMPS': 'SHAKTIPUMPS',
    'SUZLON ENERGY LIMITED': 'SUZLON',
    'SUZLON ENERGY LTD': 'SUZLON',
    'SUZLON ENERGY': 'SUZLON',
    'HDFC BANK LTD': 'HDFCBANK',
    'INFOSYS LTD': 'INFY',
    'TATA CONSULTANCY': 'TCS',
    'RELIANCE INDUSTRIES': 'RELIANCE',
    'ICICI BANK': 'ICICIBANK',
    'AXIS BANK': 'AXISBANK',
    'BAJAJ FINANCE': 'BAJFINANCE',
    'STATE BANK OF INDIA': 'SBIN',
    'WIPRO LTD': 'WIPRO',
    'SUN PHARMACEUTICAL': 'SUNPHARMA',
    'TATA MOTORS': 'TATAMOTORS',
    'TATA MOTORS PASS VEH LTD': 'TATAMOTORS',
    'MARUTI SUZUKI': 'MARUTI',
    'ASIAN PAINTS': 'ASIANPAINT',
    'TITAN COMPANY': 'TITAN',
    'NESTLE INDIA': 'NESTLEIND',
    'BRITANNIA INDUSTRIES': 'BRITANNIA',
    'LARSEN & TOUBRO': 'LT',
    'BHARTI AIRTEL': 'BHARTIARTL',
    'NTPC LTD': 'NTPC',
    'ONGC': 'ONGC',
    'COAL INDIA': 'COALINDIA',
    'HCL TECHNOLOGIES': 'HCLTECH',
    'TECH MAHINDRA': 'TECHM',
    'DR REDDYS': 'DRREDDY',
    'CIPLA LTD': 'CIPLA',
    'APOLLO HOSPITALS': 'APOLLOHOSP',
    'JSW STEEL': 'JSWSTEEL',
    'TATA STEEL': 'TATASTEEL',
    'HINDALCO': 'HINDALCO',
    'ADANI ENTERPRISES': 'ADANIENT',
    'ADANI PORTS': 'ADANIPORTS',
    'ULTRATECH CEMENT': 'ULTRACEMCO',
    'GRASIM INDUSTRIES': 'GRASIM',
    'ZOMATO LTD': 'ZOMATO',
    'ZOMATO': 'ZOMATO',
    'ONE97 COMMUNICATIONS': 'PAYTM',
    'PAYTM': 'PAYTM',
    'FSN E-COMMERCE': 'NYKAA',
    'NYKAA': 'NYKAA',
    'PB FINTECH': 'POLICYBZR',
    'POLICYBAZAAR': 'POLICYBZR',
    'DELHIVERY LTD': 'DELHIVERY',
    'DELHIVERY': 'DELHIVERY',
    'CE INFO SYSTEMS': 'MAPMYINDIA',
    'MAPMYINDIA': 'MAPMYINDIA',
    'IDEAFORGE TECHNOLOGY': 'IDEAFORGE',
    'IDEAFORGE': 'IDEAFORGE',
    'KAYNES TECHNOLOGY': 'KAYNES',
    'KAYNES': 'KAYNES',
    'SYRMA SGS': 'SYRMA',
    'SYRMA': 'SYRMA',
    'AVALON TECHNOLOGIES': 'AVALON',
    'AVALON': 'AVALON',
    'PENTA GOLD': 'PENTAGOLD',
    'PENTAGOLD': 'PENTAGOLD',
    'INOX GREEN ENERGY': 'INOXGREEN',
    'INOXGREEN': 'INOXGREEN',
    'WAAREE RENEWABLES': 'WAAREE',
    'WAAREE': 'WAAREE',
    'PREMIER ENERGIES': 'PREMIER',
    'PREMIER': 'PREMIER',
    'EPIGRAL LTD': 'EPIGRAL',
    'EPIGRAL': 'EPIGRAL',
    'JYOTI CNC AUTOMATION': 'JYOTCNC',
    'JYOTI CNC': 'JYOTCNC',
    'LE TRAVENUES': 'IXIGO',
    'IXIGO': 'IXIGO',
    'COMPUTER AGE MGMT': 'CAMS',
    'CAMS': 'CAMS',
    'ANGEL ONE': 'ANGELONE',
    'ANGELONE': 'ANGELONE',
    'RATEGAIN TRAVEL': 'RATEGAIN',
    'RATEGAIN': 'RATEGAIN',
    'AMARA RAJA ENERGY & MOBILITY': 'AMARAJABAT',
    'AMARA RAJA ENERGY AND MOBILITY': 'AMARAJABAT',
    'MOTISONS JEWELLERS': 'MOTISONSJW',
    'INDIAN RAILWAY FINANCE CORPORATION': 'IRFC',
    'INDIAN RAILWAY FINANCE': 'IRFC',
    'IRFC': 'IRFC',
    'CRIZAC': 'CRIZAC',
    'NHPC': 'NHPC',
    'NHPC LTD': 'NHPC',
  };

  for (const [key, val] of Object.entries(nameMap)) {
    if (n === key) return val;
  }
  for (const [key, val] of Object.entries(nameMap)) {
    if (n.includes(key)) return val;
  }

  return n
    .replace(/\s?(LTD\.?|LIMITED|PVT|INDUSTRIES|ENTERPRISES|TECHNOLOGIES|FINANCE|BANK|ENERGY|INFRA\.?|INTERNATIONAL|EXPORTS|PASS VEH|REN POW SYS|EQ NEW FV RE\.?\d+\/?-?|EQ)\s?/gi, '')
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 10);
}

function cleanSymbolForSector(symbol: string): string {
  return symbol.replace(/\.(NS|BO)$/i, '');
}

function mapSector(sym: string): string {
  const sectorMap: Record<string, string> = {
    HDFCBANK: 'Financial Services', ICICIBANK: 'Financial Services',
    AXISBANK: 'Financial Services', SBIN: 'Financial Services',
    KOTAKBANK: 'Financial Services', BAJFINANCE: 'Financial Services',
    BAJAJHFL: 'Financial Services', FIVESTAR: 'Financial Services',
    HDFCLIFE: 'Financial Services', SBILIFE: 'Financial Services',
    CHOLAFIN: 'Financial Services', MUTHOOTFIN: 'Financial Services',
    MANAPPURAM: 'Financial Services', PFC: 'Financial Services',
    RECLTD: 'Financial Services', ANGELONE: 'Financial Services',
    CAMS: 'Financial Services', PAYTM: 'Financial Services',
    POLICYBZR: 'Financial Services', IRFC: 'Financial Services',
    TCS: 'IT', INFY: 'IT', WIPRO: 'IT', HCLTECH: 'IT',
    TECHM: 'IT', NAUKRI: 'IT', PERSISTENT: 'IT', LTIM: 'IT',
    COFORGE: 'IT', ZENSARTECH: 'IT',
    MAPMYINDIA: 'Technology', RATEGAIN: 'Technology', NEWGEN: 'Technology',
    RELIANCE: 'Energy', ONGC: 'Energy', NTPC: 'Energy',
    IREDA: 'Energy', INDOWIND: 'Energy', SUZLON: 'Energy',
    COALINDIA: 'Energy', POWERGRID: 'Utilities',
    INOXGREEN: 'Energy', WAAREE: 'Energy', ADANIPOWER: 'Energy',
    JSWENERGY: 'Energy', TATAPOWER: 'Energy', TORNTPOWER: 'Energy',
    CESC: 'Energy', GAIL: 'Energy',
    SUNPHARMA: 'Healthcare', DRREDDY: 'Healthcare',
    CIPLA: 'Healthcare', APOLLOHOSP: 'Healthcare', DIVISLAB: 'Healthcare',
    AUROPHARMA: 'Healthcare', LUPIN: 'Healthcare', BIOCON: 'Healthcare',
    MAXHEALTH: 'Healthcare', FORTIS: 'Healthcare',
    TATAMOTORS: 'Automobile', MARUTI: 'Automobile',
    MERCURYEV: 'Automobile', OLECTRA: 'Automobile',
    AMARAJABAT: 'Automobile',
    JBM_AUTO: 'Automobile', GREAVESCOT: 'Automobile',
    ASHOKLEY: 'Automobile', EICHERMOT: 'Automobile',
    HEROMOTOCO: 'Automobile', TVSMOTOR: 'Automobile',
    ASIANPAINT: 'Consumer Goods', TITAN: 'Consumer Goods',
    BERGEPAINT: 'Consumer Goods', PIDILITIND: 'Consumer Goods',
    DABUR: 'Consumer Goods', GODREJCP: 'Consumer Goods',
    HAVELLS: 'Consumer Goods', CROMPTON: 'Consumer Goods',
    KANSAINER: 'Consumer Goods', MOTISONSJW: 'Jewellery',
    NESTLEIND: 'FMCG', BRITANNIA: 'FMCG', HINDUNILVR: 'FMCG',
    ITC: 'FMCG', MARICO: 'FMCG', COLPAL: 'FMCG',
    GILLETTE: 'FMCG', MCDOWELL: 'FMCG', UBL: 'FMCG',
    LT: 'Infrastructure', IRCON: 'Infrastructure',
    ADANIPORTS: 'Infrastructure', RVNL: 'Infrastructure',
    NBCC: 'Infrastructure', WELCORP: 'Infrastructure',
    KNRCON: 'Infrastructure', PATELENG: 'Infrastructure',
    NCC: 'Infrastructure', GTLINFRA: 'Infrastructure',
    BHARTIARTL: 'Telecom',
    INDUSTOWER: 'Telecom', TATACOMM: 'Telecom',
    TEJASNET: 'Telecom', ITI: 'Telecom', HFCL: 'Telecom',
    STLTECH: 'Telecom', VODAFONEIDE: 'Telecom',
    JSWSTEEL: 'Materials', TATASTEEL: 'Materials',
    HINDALCO: 'Materials', ULTRACEMCO: 'Materials', GRASIM: 'Materials',
    SHREECEM: 'Materials', AMBUJACEM: 'Materials', ACC: 'Materials',
    VEDL: 'Materials', NMDC: 'Materials', SAIL: 'Materials',
    JINDALSTEL: 'Materials', PENTAGOLD: 'Materials', EPIGRAL: 'Materials',
    SHAKTIPUMPS: 'Industrials', SERVOTECH: 'Industrials',
    SIEMENS: 'Industrials', ABB: 'Industrials', HAL: 'Industrials',
    KSB: 'Industrials', KIRLOSKAR: 'Industrials',
    BEL: 'Industrials', BHEL: 'Industrials', CGPOWER: 'Industrials',
    IDEAFORGE: 'Industrials', KAYNES: 'Industrials', SYRMA: 'Industrials',
    AVALON: 'Industrials', PREMIER: 'Industrials', JYOTCNC: 'Industrials',
    CRIZAC: 'Industrials',
    GOKALDAS: 'Textiles', PAGEIND: 'Textiles', KPRMILL: 'Textiles',
    RAYMOND: 'Textiles', ARVIND: 'Textiles', TRIDENT: 'Textiles',
    DLF: 'Real Estate', OBEROIRLTY: 'Real Estate', PRESTIGE: 'Real Estate',
    GODREJPROP: 'Real Estate', SOBHA: 'Real Estate', BRIGADE: 'Real Estate',
    PHOENIXLTD: 'Real Estate', MACROTECH: 'Real Estate',
    ZEEL: 'Media', SUNTV: 'Media', PVRINOX: 'Media', SAREGAMA: 'Media',
    ADANIENT: 'Conglomerate',
    NHPC: 'Utilities',
    ZOMATO: 'Consumer Services', NYKAA: 'Consumer Services',
    IXIGO: 'Consumer Services', INDIAMART: 'Consumer Services',
    DELHIVERY: 'Logistics', BLUEDART: 'Logistics',
    TCI: 'Logistics', VRLLOG: 'Logistics', ALLCARGO: 'Logistics',
  };
  return sectorMap[sym.toUpperCase()] || 'Others';
}

function parseKotakPortfolioTracker(filePath: string): ParseResult {
  const errors: string[] = [];
  const holdings: Holding[] = [];

  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      line.startsWith('Script Name') ||
      line === 'Equity' ||
      line === 'Mutual Fund' ||
      line.startsWith('Total') ||
      line.startsWith('Grand Total')
    ) continue;

    try {
      const cols: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ''; }
        else { current += ch; }
      }
      cols.push(current.trim());

      if (cols.length < 9) continue;

      if (cols[2] && !cols[2].toUpperCase().includes('EQUITY')) continue;

      const companyName = cols[0].replace(/\s*-\s*EQ.*$/i, '').trim();
      const isin = cols[1].trim();
      const quantity = parseFloat(cols[4]) || 0;
      const avgCost = parseFloat(cols[5]) || 0;
      const investedValue = parseFloat(cols[6]) || 0;
      const currentPrice = parseFloat(cols[7]) || 0;
      const currentValue = parseFloat(cols[8]) || 0;
      const pnl = cols[9] ? parseFloat(cols[9]) || 0 : currentValue - investedValue;

      if (!companyName || quantity <= 0) continue;

      const symbol = ISIN_TO_SYMBOL[isin] || nameToSymbol(companyName);
      const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
      const cleanSym = cleanSymbolForSector(symbol);

      holdings.push({
        symbol: yahooSymbol,
        companyName,
        quantity,
        avgCost,
        currentPrice,
        sector: mapSector(cleanSym),
        investedValue: investedValue > 0 ? investedValue : quantity * avgCost,
        currentValue: currentValue > 0 ? currentValue : quantity * currentPrice,
        pnl,
        pnlPercent: investedValue > 0 ? (pnl / investedValue) * 100 : 0,
        source: 'kotak_portfolio_tracker',
      });
    } catch (e) {
      errors.push(`Row ${i + 1}: ${e}`);
    }
  }

  const totalInvested = holdings.reduce((s, h) => s + h.investedValue, 0);
  return { holdings, source: 'kotak_portfolio_tracker', totalInvested, errors };
}

function parseCDSLCas(filePath: string): ParseResult {
  const XLSX = require('xlsx');
  const errors: string[] = [];
  const holdings: Holding[] = [];

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (rows.length < 2) {
    return { holdings: [], source: 'cdsl_cas', totalInvested: 0, errors: ['CDSL CAS sheet appears empty'] };
  }

  let headerRowIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;
    const firstCell = row[0]?.toString().trim() || '';
    if (firstCell === 'Stock Name' && row[1]?.toString().trim() === 'ISIN') {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    return { holdings: [], source: 'cdsl_cas', totalInvested: 0, errors: ['Could not find holdings header in CDSL CAS'] };
  }

  const headers = rows[headerRowIdx].map((h: any) => h?.toString().toLowerCase().trim() || '');
  const colMap: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (h.includes('stock') || h.includes('name')) colMap['name'] = i;
    if (h.includes('isin')) colMap['isin'] = i;
    if (h.includes('quantity') || h.includes('qty')) colMap['quantity'] = i;
    if (h.includes('average') || h.includes('buy price') || h.includes('avg')) colMap['avgCost'] = i;
    if (h.includes('buy value') || h.includes('invested')) colMap['buyValue'] = i;
    if (h.includes('closing price') || (h.includes('price') && !h.includes('buy'))) colMap['closingPrice'] = i;
    if (h.includes('closing value') || h.includes('current value')) colMap['closingValue'] = i;
    if (h.includes('unrealised') || h.includes('pnl') || h.includes('p&l')) colMap['pnl'] = i;
  }

  if (colMap['name'] === undefined || colMap['quantity'] === undefined) {
    return { holdings: [], source: 'cdsl_cas', totalInvested: 0, errors: ['Could not identify required columns'] };
  }

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const companyName = row[colMap['name']]?.toString().trim() || '';
    const isin = colMap['isin'] !== undefined ? row[colMap['isin']]?.toString().trim() : '';
    const quantity = parseFloat(row[colMap['quantity']]) || 0;
    const avgCost = colMap['avgCost'] !== undefined ? parseFloat(row[colMap['avgCost']]) || 0 : 0;
    const buyValue = colMap['buyValue'] !== undefined ? parseFloat(row[colMap['buyValue']]) || 0 : 0;
    const closingPrice = colMap['closingPrice'] !== undefined ? parseFloat(row[colMap['closingPrice']]) || 0 : 0;
    const closingValue = colMap['closingValue'] !== undefined ? parseFloat(row[colMap['closingValue']]) || 0 : 0;
    const pnl = colMap['pnl'] !== undefined ? parseFloat(row[colMap['pnl']]) || 0 : 0;

    if (!companyName || quantity <= 0) continue;

    const lowerName = companyName.toLowerCase();
    if (lowerName.includes('mutual') || lowerName.includes('bond') ||
        lowerName.includes('etf') || lowerName.includes('liquid') ||
        lowerName.includes('summary') || lowerName.includes('total')) continue;

    const symbol = ISIN_TO_SYMBOL[isin] || nameToSymbol(companyName);
    const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
    const investedValue = buyValue > 0 ? buyValue : quantity * avgCost;
    const currentValue = closingValue > 0 ? closingValue : quantity * closingPrice;
    const currentPrice = quantity > 0 ? currentValue / quantity : 0;
    const avgCostCalc = avgCost > 0 ? avgCost : (investedValue / quantity);
    const cleanSym = cleanSymbolForSector(symbol);

    holdings.push({
      symbol: yahooSymbol,
      companyName,
      quantity,
      avgCost: avgCostCalc,
      currentPrice,
      sector: mapSector(cleanSym),
      investedValue,
      currentValue,
      pnl: pnl !== 0 ? pnl : (currentValue - investedValue),
      pnlPercent: investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0,
      source: 'cdsl_cas',
    });
  }

  const totalInvested = holdings.reduce((s, h) => s + h.investedValue, 0);
  return { holdings, source: 'cdsl_cas', totalInvested, errors };
}

function parseGrowwXlsx(filePath: string): ParseResult {
  const XLSX = require('xlsx');
  const errors: string[] = [];
  const holdings: Holding[] = [];

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  let headerRowIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i][0] === 'Stock Name') {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    return { holdings: [], source: 'groww_xlsx', totalInvested: 0, errors: ['Could not find holdings data in Groww file'] };
  }

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0] || typeof row[0] !== 'string') continue;

    const companyName = row[0].trim();
    const isin = row[1]?.toString().trim() || '';
    const quantity = parseFloat(row[2]) || 0;
    const avgCost = parseFloat(row[3]) || 0;
    const buyValue = parseFloat(row[4]) || 0;
    const closingPrice = parseFloat(row[5]) || 0;
    const closingValue = parseFloat(row[6]) || 0;

    if (!companyName || quantity <= 0) continue;

    const symbol = ISIN_TO_SYMBOL[isin] || nameToSymbol(companyName);
    const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
    const investedValue = buyValue || quantity * avgCost;
    const currentValue = closingValue || quantity * closingPrice;
    const currentPrice = quantity > 0 ? currentValue / quantity : 0;
    const cleanSym = cleanSymbolForSector(symbol);

    holdings.push({
      symbol: yahooSymbol,
      companyName,
      quantity,
      avgCost,
      currentPrice,
      sector: mapSector(cleanSym),
      investedValue,
      currentValue,
      pnl: (closingValue || 0) - (buyValue || 0),
      pnlPercent: buyValue > 0 ? (((closingValue || 0) - buyValue) / buyValue) * 100 : 0,
      source: 'groww_xlsx',
    });
  }

  const totalInvested = holdings.reduce((s, h) => s + h.investedValue, 0);
  return { holdings, source: 'groww_xlsx', totalInvested, errors };
}

function parseCSV(filePath: string): ParseResult {
  const errors: string[] = [];
  const holdings: Holding[] = [];

  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length < 2) {
    return { holdings: [], source: 'unknown', totalInvested: 0, errors: ['File is empty or has no data rows'] };
  }

  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = headerLine.split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());

  const isZerodha = headers.includes('instrument') && headers.includes('qty');
  const isGrowwCsv = headers.includes('stock name') && headers.includes('isin');
  const source = isZerodha ? 'zerodha' : isGrowwCsv ? 'groww_csv' : 'custom';

  for (let i = 1; i < lines.length; i++) {
    try {
      const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
      if (cols.length < 3) continue;

      let symbol = '', companyName = '', qty = 0, avgCost = 0,
          sector = '', closingPrice = 0, closingValue = 0, buyValue = 0;

      if (isZerodha) {
        symbol = cols[0]?.replace(/-EQ/i, '').trim() || '';
        companyName = symbol;
        qty = parseFloat(cols[1]) || 0;
        avgCost = parseFloat(cols[2]) || 0;
      } else if (isGrowwCsv) {
        companyName = cols[0]?.trim() || '';
        const isin = cols[1]?.trim() || '';
        qty = parseFloat(cols[2]) || 0;
        avgCost = parseFloat(cols[3]) || 0;
        buyValue = parseFloat(cols[4]) || 0;
        closingPrice = parseFloat(cols[5]) || 0;
        closingValue = parseFloat(cols[6]) || 0;
        symbol = ISIN_TO_SYMBOL[isin] || nameToSymbol(companyName);
      } else {
        const symIdx = headers.findIndex(h => ['symbol', 'stock', 'scrip'].includes(h));
        const nameIdx = headers.findIndex(h => h.includes('company') || h.includes('name'));
        const qtyIdx = headers.findIndex(h => ['quantity', 'qty', 'shares'].includes(h));
        const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('avg') || h.includes('price'));
        symbol = (symIdx >= 0 ? cols[symIdx] : cols[0])?.trim() || '';
        companyName = (nameIdx >= 0 ? cols[nameIdx] : symbol)?.trim() || symbol;
        qty = parseFloat(qtyIdx >= 0 ? cols[qtyIdx] : cols[2]) || 0;
        avgCost = parseFloat(costIdx >= 0 ? cols[costIdx] : cols[3]) || 0;
        sector = mapSector(cleanSymbolForSector(symbol)); // always normalize, ignore raw CSV sector column
      }

      if (!symbol || qty <= 0) continue;

      const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
      const investedValue = buyValue > 0 ? buyValue : qty * avgCost;
      const currentValue = closingValue > 0 ? closingValue : (closingPrice > 0 ? qty * closingPrice : 0);
      const currentPrice = qty > 0 ? currentValue / qty : avgCost;
      const cleanSym = cleanSymbolForSector(symbol);

      holdings.push({
        symbol: yahooSymbol,
        companyName: companyName || symbol,
        quantity: qty,
        avgCost,
        currentPrice,
        sector: sector || mapSector(cleanSym),
        investedValue,
        currentValue: currentValue || investedValue,
        pnl: currentValue > 0 ? currentValue - investedValue : 0,
        pnlPercent: investedValue > 0 && currentValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0,
        source,
      });
    } catch (e) {
      errors.push(`Row ${i + 1}: ${e}`);
    }
  }

  const totalInvested = holdings.reduce((s, h) => s + h.investedValue, 0);
  return { holdings, source, totalInvested, errors };
}

export function parseHoldingsFile(filePath: string): ParseResult {
  if (!fs.existsSync(filePath)) {
    return { holdings: [], source: 'unknown', totalInvested: 0, errors: [`File not found: ${filePath}`] };
  }

  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();

  if (ext === '.csv') {
    const firstLine = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '').split('\n')[0];
    if (firstLine.includes('Script Name') && firstLine.includes('Avg Unit Cost')) {
      return parseKotakPortfolioTracker(filePath);
    }
  }

  if (ext === '.xlsx' || ext === '.xls') {
    if (fileName.includes('holdings_statement') || fileName.includes('cas') || fileName.includes('cdsl')) {
      const result = parseCDSLCas(filePath);
      if (result.holdings.length > 0) return result;
    }
    return parseGrowwXlsx(filePath);
  }

  return parseCSV(filePath);
}