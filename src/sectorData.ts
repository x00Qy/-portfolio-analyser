export interface SectorAlternative {
  symbol: string;
  name: string;
  sector: string;
  why: string;
  riskProfile: string;
  dividendYield: string;
}

const HARDCODED_ALTERNATIVES: Record<string, SectorAlternative[]> = {
  'Financial Services': [
    { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Financial Services', why: 'Largest private bank, stable NIMs, strong CASA', riskProfile: 'Low', dividendYield: '1.2%' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Financial Services', why: 'Digital leader, improving asset quality', riskProfile: 'Low-Med', dividendYield: '0.8%' },
    { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Financial Services', why: 'Conservative management, strong capital', riskProfile: 'Low', dividendYield: '0.1%' },
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'Financial Services', why: 'NBFC leader, diversified lending', riskProfile: 'Med', dividendYield: '0.5%' },
    { symbol: 'CHOLAFIN', name: 'Cholamandalam Finance', sector: 'Financial Services', why: 'Vehicle finance, rural focus', riskProfile: 'Med', dividendYield: '0.4%' },
    { symbol: 'MUTHOOTFIN', name: 'Muthoot Finance', sector: 'Financial Services', why: 'Gold loan leader, stable cash flows', riskProfile: 'Low-Med', dividendYield: '1.2%' },
    { symbol: 'MANAPPURAM', name: 'Manappuram Finance', sector: 'Financial Services', why: 'Gold loans, microfinance', riskProfile: 'Med', dividendYield: '1.5%' },
    { symbol: 'FIVESTAR', name: 'Five-Star Business Finance', sector: 'Financial Services', why: 'SME lending, secured loans', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'PFC', name: 'Power Finance Corp', sector: 'Financial Services', why: 'Power sector financing, PSU dividend', riskProfile: 'Low-Med', dividendYield: '3.5%' },
    { symbol: 'RECLTD', name: 'REC Ltd', sector: 'Financial Services', why: 'Rural electrification financing', riskProfile: 'Low-Med', dividendYield: '3.2%' },
    { symbol: 'SBIN', name: 'State Bank of India', sector: 'Financial Services', why: 'Largest PSU bank, government backing', riskProfile: 'Low-Med', dividendYield: '1.8%' },
    { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Financial Services', why: 'Improving retail franchise, digital push', riskProfile: 'Low-Med', dividendYield: '0.6%' },
    { symbol: 'BAJAJHFL', name: 'Bajaj Housing Finance', sector: 'Financial Services', why: 'Housing finance, Bajaj group', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'ANGELONE', name: 'Angel One', sector: 'Financial Services', why: 'Discount broking, fintech platform', riskProfile: 'Med', dividendYield: '0.5%' },
    { symbol: 'CAMS', name: 'Computer Age Mgmt', sector: 'Financial Services', why: 'RTA services, mutual fund registry', riskProfile: 'Low-Med', dividendYield: '1.0%' },
    { symbol: 'PAYTM', name: 'One97 Communications', sector: 'Financial Services', why: 'Payments, financial services, commerce', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'POLICYBZR', name: 'PB Fintech', sector: 'Financial Services', why: 'Insurance comparison, Paisabazaar', riskProfile: 'High', dividendYield: '0%' },
  ],
  'IT': [
    { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT', why: 'Largest IT co, strong margins, dividend king', riskProfile: 'Low', dividendYield: '1.4%' },
    { symbol: 'INFY', name: 'Infosys', sector: 'IT', why: 'Digital transformation leader, stable growth', riskProfile: 'Low-Med', dividendYield: '2.1%' },
    { symbol: 'HCLTECH', name: 'HCL Technologies', sector: 'IT', why: 'Diversified services, reasonable valuation', riskProfile: 'Med', dividendYield: '2.8%' },
    { symbol: 'WIPRO', name: 'Wipro', sector: 'IT', why: 'Turnaround story, improving margins', riskProfile: 'Med', dividendYield: '1.5%' },
    { symbol: 'TECHM', name: 'Tech Mahindra', sector: 'IT', why: 'Telecom IT, 5G rollout beneficiary', riskProfile: 'Med', dividendYield: '1.8%' },
    { symbol: 'NAUKRI', name: 'Info Edge (Naukri)', sector: 'IT', why: 'Online classifieds, 99acres, Jeevansathi', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'PERSISTENT', name: 'Persistent Systems', sector: 'IT', why: 'Digital engineering, cloud, data', riskProfile: 'Med', dividendYield: '0.6%' },
    { symbol: 'LTIM', name: 'LTIMindtree', sector: 'IT', why: 'L&T IT services, digital engineering', riskProfile: 'Low-Med', dividendYield: '1.0%' },
    { symbol: 'COFORGE', name: 'Coforge Ltd', sector: 'IT', why: 'IT services, BFSI, travel', riskProfile: 'Med', dividendYield: '0.5%' },
    { symbol: 'ZENSARTECH', name: 'Zensar Technologies', sector: 'IT', why: 'IT services, digital, infrastructure', riskProfile: 'Med', dividendYield: '1.2%' },
  ],
  'Technology': [
    { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'Technology', why: 'Largest IT co, strong margins, dividend king', riskProfile: 'Low', dividendYield: '1.4%' },
    { symbol: 'INFY', name: 'Infosys', sector: 'Technology', why: 'Digital transformation leader, stable growth', riskProfile: 'Low-Med', dividendYield: '2.1%' },
    { symbol: 'HCLTECH', name: 'HCL Technologies', sector: 'Technology', why: 'Diversified services, reasonable valuation', riskProfile: 'Med', dividendYield: '2.8%' },
    { symbol: 'WIPRO', name: 'Wipro', sector: 'Technology', why: 'Turnaround story, improving margins', riskProfile: 'Med', dividendYield: '1.5%' },
    { symbol: 'TECHM', name: 'Tech Mahindra', sector: 'Technology', why: 'Telecom IT, 5G rollout beneficiary', riskProfile: 'Med', dividendYield: '1.8%' },
    { symbol: 'NAUKRI', name: 'Info Edge (Naukri)', sector: 'Technology', why: 'Online classifieds, 99acres, Jeevansathi', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'PERSISTENT', name: 'Persistent Systems', sector: 'Technology', why: 'Digital engineering, cloud, data', riskProfile: 'Med', dividendYield: '0.6%' },
    { symbol: 'LTIM', name: 'LTIMindtree', sector: 'Technology', why: 'L&T IT services, digital engineering', riskProfile: 'Low-Med', dividendYield: '1.0%' },
    { symbol: 'COFORGE', name: 'Coforge Ltd', sector: 'Technology', why: 'IT services, BFSI, travel', riskProfile: 'Med', dividendYield: '0.5%' },
    { symbol: 'ZENSARTECH', name: 'Zensar Technologies', sector: 'Technology', why: 'IT services, digital, infrastructure', riskProfile: 'Med', dividendYield: '1.2%' },
    { symbol: 'MAPMYINDIA', name: 'CE Info Systems', sector: 'Technology', why: 'Digital maps, navigation, IoT', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'RATEGAIN', name: 'RateGain Travel', sector: 'Technology', why: 'Travel tech, SaaS, distribution', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'NEWGEN', name: 'Newgen Software', sector: 'Technology', why: 'BPM, ECM, low-code platform', riskProfile: 'Med', dividendYield: '0.4%' },
  ],
  'Energy': [
    { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', why: 'Conglomerate, green energy pivot, Jio monetization', riskProfile: 'Low-Med', dividendYield: '0.3%' },
    { symbol: 'ONGC', name: 'Oil & Natural Gas Corp', sector: 'Energy', why: 'PSU dividend play, crude price beneficiary', riskProfile: 'Med', dividendYield: '4.2%' },
    { symbol: 'NTPC', name: 'NTPC Ltd', sector: 'Energy', why: 'Power generation leader, green transition', riskProfile: 'Low-Med', dividendYield: '2.8%' },
    { symbol: 'POWERGRID', name: 'Power Grid Corp', sector: 'Energy', why: 'Monopoly transmission, stable dividends', riskProfile: 'Low', dividendYield: '3.5%' },
    { symbol: 'INOXWIND', name: 'Inox Wind', sector: 'Energy', why: 'Wind turbine manufacturer, order book growth', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'WEBELSOLAR', name: 'Websol Energy', sector: 'Energy', why: 'Solar cell manufacturing', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'PFC', name: 'Power Finance Corp', sector: 'Energy', why: 'Power sector financing, PSU dividend', riskProfile: 'Low-Med', dividendYield: '3.5%' },
    { symbol: 'RECLTD', name: 'REC Ltd', sector: 'Energy', why: 'Rural electrification financing', riskProfile: 'Low-Med', dividendYield: '3.2%' },
    { symbol: 'NHPC', name: 'NHPC Ltd', sector: 'Energy', why: 'Hydro power, renewable expansion', riskProfile: 'Low', dividendYield: '2.5%' },
    { symbol: 'SUZLON', name: 'Suzlon Energy', sector: 'Energy', why: 'Wind energy leader, order revival', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'INDOWIND', name: 'Indowind Energy', sector: 'Energy', why: 'Wind power developer, asset light', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'COALINDIA', name: 'Coal India', sector: 'Energy', why: 'Coal monopoly, PSU dividend', riskProfile: 'Low', dividendYield: '5.2%' },
    { symbol: 'GAIL', name: 'GAIL India', sector: 'Energy', why: 'Gas transmission, petrochemicals', riskProfile: 'Low-Med', dividendYield: '2.8%' },
    { symbol: 'TATAPOWER', name: 'Tata Power', sector: 'Energy', why: 'Renewable pivot, distribution', riskProfile: 'Med', dividendYield: '0.8%' },
    { symbol: 'INOXGREEN', name: 'Inox Green Energy', sector: 'Energy', why: 'Wind power services, O&M', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'WAAREE', name: 'Waaree Renewables', sector: 'Energy', why: 'Solar EPC, module manufacturing', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'ADANIPOWER', name: 'Adani Power', sector: 'Energy', why: 'Thermal power, capacity expansion', riskProfile: 'Med-High', dividendYield: '0%' },
    { symbol: 'JSWENERGY', name: 'JSW Energy', sector: 'Energy', why: 'Renewable power, green hydrogen', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'TORNTPOWER', name: 'Torrent Power', sector: 'Energy', why: 'Ahmedabad, Surat distribution', riskProfile: 'Low-Med', dividendYield: '1.2%' },
    { symbol: 'CESC', name: 'CESC Ltd', sector: 'Energy', why: 'Kolkata distribution, retail', riskProfile: 'Low-Med', dividendYield: '2.5%' },
  ],
  'Healthcare': [
    { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Healthcare', why: 'Largest Indian pharma, US generics recovery', riskProfile: 'Low-Med', dividendYield: '0.9%' },
    { symbol: 'DRREDDY', name: "Dr Reddy's Laboratories", sector: 'Healthcare', why: 'Diversified geographies, strong pipeline', riskProfile: 'Med', dividendYield: '0.7%' },
    { symbol: 'CIPLA', name: 'Cipla', sector: 'Healthcare', why: 'Domestic formulations leader, US growth', riskProfile: 'Med', dividendYield: '0.6%' },
    { symbol: 'DIVISLAB', name: 'Divis Laboratories', sector: 'Healthcare', why: 'API manufacturer, margin stability', riskProfile: 'Low-Med', dividendYield: '0.8%' },
    { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals', sector: 'Healthcare', why: 'Hospital chain, pharmacy expansion', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'AUROPHARMA', name: 'Aurobindo Pharma', sector: 'Healthcare', why: 'Generics, API, injectables', riskProfile: 'Med', dividendYield: '0.5%' },
    { symbol: 'LUPIN', name: 'Lupin Ltd', sector: 'Healthcare', why: 'Complex generics, biosimilars', riskProfile: 'Med', dividendYield: '0.6%' },
    { symbol: 'BIOCON', name: 'Biocon', sector: 'Healthcare', why: 'Biosimilars, research services', riskProfile: 'Med-High', dividendYield: '0.2%' },
    { symbol: 'MAXHEALTH', name: 'Max Healthcare', sector: 'Healthcare', why: 'Hospital chain, north India focus', riskProfile: 'Med', dividendYield: '0.2%' },
    { symbol: 'FORTIS', name: 'Fortis Healthcare', sector: 'Healthcare', why: 'Hospital network, turnaround', riskProfile: 'Med', dividendYield: '0%' },
  ],
  'Automobile': [
    { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Automobile', why: 'Market leader, SUV push, export growth', riskProfile: 'Low-Med', dividendYield: '1.2%' },
    { symbol: 'M&M', name: 'Mahindra & Mahindra', sector: 'Automobile', why: 'SUV specialist, farm equipment, EV push', riskProfile: 'Med', dividendYield: '0.9%' },
    { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto', sector: 'Automobile', why: 'Export king, EV scooters, premium bikes', riskProfile: 'Low-Med', dividendYield: '2.1%' },
    { symbol: 'OLECTRA', name: 'Olectra Greentech', sector: 'Automobile', why: 'Electric buses, government orders', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'JBM_AUTO', name: 'JBM Auto', sector: 'Automobile', why: 'Auto components, EV systems', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'GREAVESCOT', name: 'Greaves Cotton', sector: 'Automobile', why: 'Electric mobility, Ampere EVs', riskProfile: 'Med-High', dividendYield: '1.2%' },
    { symbol: 'ASHOKLEY', name: 'Ashok Leyland', sector: 'Automobile', why: 'Commercial vehicles, LCV growth', riskProfile: 'Med', dividendYield: '1.5%' },
    { symbol: 'EICHERMOT', name: 'Eicher Motors', sector: 'Automobile', why: 'Royal Enfield, Volvo JV', riskProfile: 'Low-Med', dividendYield: '0.8%' },
    { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp', sector: 'Automobile', why: 'Two-wheeler leader, EV scooters', riskProfile: 'Low-Med', dividendYield: '2.8%' },
    { symbol: 'TVSMOTOR', name: 'TVS Motor', sector: 'Automobile', why: 'Two-wheeler, three-wheeler, EV push', riskProfile: 'Med', dividendYield: '0.6%' },
    { symbol: 'MERCURYEV', name: 'Mercury EV Tech', sector: 'Automobile', why: 'Electric vehicle components', riskProfile: 'High', dividendYield: '0%' },
  ],
  'Jewellery': [
    { symbol: 'KALYANKJIL', name: 'Kalyan Jewellers', sector: 'Jewellery', why: 'Second largest jewellery retailer, franchise model', riskProfile: 'Med', dividendYield: '0.5%' },
    { symbol: 'SENCO', name: 'Senco Gold', sector: 'Jewellery', why: 'Eastern India jewellery retailer, rapid expansion', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'PCJEWELLER', name: 'PC Jeweller', sector: 'Jewellery', why: 'North India jewellery chain, turnaround story', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'TITAN', name: 'Titan Company', sector: 'Jewellery', why: 'Tanishq brand, largest jewellery retailer in India', riskProfile: 'Low-Med', dividendYield: '0.3%' },
  ],

  'Consumer Goods': [
    { symbol: 'ASIANPAINT', name: 'Asian Paints', sector: 'Consumer Goods', why: 'Paint monopoly, pricing power, rural reach', riskProfile: 'Low', dividendYield: '0.8%' },
    { symbol: 'TITAN', name: 'Titan Company', sector: 'Consumer Goods', why: 'Jewelry leader, eyewear, watches', riskProfile: 'Low-Med', dividendYield: '0.3%' },
    { symbol: 'NESTLEIND', name: 'Nestle India', sector: 'Consumer Goods', why: 'FMCG giant, pricing power, rural push', riskProfile: 'Low', dividendYield: '1.2%' },
    { symbol: 'BERGEPAINT', name: 'Berger Paints', sector: 'Consumer Goods', why: 'Second largest paint co, growth markets', riskProfile: 'Low-Med', dividendYield: '0.6%' },
    { symbol: 'KANSAINER', name: 'Kansai Nerolac', sector: 'Consumer Goods', why: 'Industrial paints, auto coatings', riskProfile: 'Low-Med', dividendYield: '0.8%' },
    { symbol: 'PIDILITIND', name: 'Pidilite Industries', sector: 'Consumer Goods', why: 'Adhesives, Fevicol brand monopoly', riskProfile: 'Low', dividendYield: '0.5%' },
    { symbol: 'DABUR', name: 'Dabur India', sector: 'Consumer Goods', why: 'Ayurveda, personal care, rural', riskProfile: 'Low', dividendYield: '0.9%' },
    { symbol: 'GODREJCP', name: 'Godrej Consumer', sector: 'Consumer Goods', why: 'Personal care, home care, Africa', riskProfile: 'Low-Med', dividendYield: '0.8%' },
    { symbol: 'HAVELLS', name: 'Havells India', sector: 'Consumer Goods', why: 'Electricals, consumer durables', riskProfile: 'Low-Med', dividendYield: '0.5%' },
    { symbol: 'CROMPTON', name: 'Crompton Greaves', sector: 'Consumer Goods', why: 'Fans, pumps, consumer electricals', riskProfile: 'Low-Med', dividendYield: '0.8%' },
  ],
  'FMCG': [
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'FMCG', why: 'FMCG leader, distribution moat, pricing power', riskProfile: 'Low', dividendYield: '1.5%' },
    { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG', why: 'Diversified, hotel recovery, FMCG growth', riskProfile: 'Low-Med', dividendYield: '2.8%' },
    { symbol: 'BRITANNIA', name: 'Britannia Industries', sector: 'FMCG', why: 'Biscuit leader, rural penetration', riskProfile: 'Low-Med', dividendYield: '1.8%' },
    { symbol: 'DABUR', name: 'Dabur India', sector: 'FMCG', why: 'Ayurveda, rural distribution', riskProfile: 'Low', dividendYield: '0.9%' },
    { symbol: 'MARICO', name: 'Marico', sector: 'FMCG', why: 'Coconut oil, personal care', riskProfile: 'Low', dividendYield: '1.5%' },
    { symbol: 'GODREJCP', name: 'Godrej Consumer', sector: 'FMCG', why: 'Personal care, home care', riskProfile: 'Low-Med', dividendYield: '0.8%' },
    { symbol: 'COLPAL', name: 'Colgate-Palmolive', sector: 'FMCG', why: 'Oral care leader, premium products', riskProfile: 'Low', dividendYield: '1.8%' },
    { symbol: 'GILLETTE', name: 'Gillette India', sector: 'FMCG', why: 'Shaving, oral care, premium', riskProfile: 'Low', dividendYield: '1.2%' },
    { symbol: 'MCDOWELL', name: 'United Spirits', sector: 'FMCG', why: 'Alcohol beverages, premiumization', riskProfile: 'Low-Med', dividendYield: '0.5%' },
    { symbol: 'UBL', name: 'United Breweries', sector: 'FMCG', why: 'Kingfisher beer, premium brands', riskProfile: 'Med', dividendYield: '0.3%' },
  ],
  'Infrastructure': [
    { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Infrastructure', why: 'EPC giant, order book strength, diversification', riskProfile: 'Low-Med', dividendYield: '0.9%' },
    { symbol: 'ADANIPORTS', name: 'Adani Ports', sector: 'Infrastructure', why: 'Port monopoly, logistics expansion', riskProfile: 'Med-High', dividendYield: '0.5%' },
    { symbol: 'RVNL', name: 'Rail Vikas Nigam', sector: 'Infrastructure', why: 'Railway projects, PSU dividend, order visibility', riskProfile: 'Med', dividendYield: '1.5%' },
    { symbol: 'IRCON', name: 'Ircon International', sector: 'Infrastructure', why: 'Railway construction, PSU', riskProfile: 'Med', dividendYield: '1.2%' },
    { symbol: 'RAILTEL', name: 'Railtel Corp', sector: 'Infrastructure', why: 'Railway telecom, digital infrastructure', riskProfile: 'Med', dividendYield: '0.8%' },
    { symbol: 'IRFC', name: 'Indian Railway Finance', sector: 'Infrastructure', why: 'Railway financing, lease income', riskProfile: 'Low-Med', dividendYield: '1.5%' },
    { symbol: 'NBCC', name: 'NBCC India', sector: 'Infrastructure', why: 'Real estate, project management', riskProfile: 'Med', dividendYield: '0.5%' },
    { symbol: 'WELCORP', name: 'Welspun Corp', sector: 'Infrastructure', why: 'Pipes, plates, infrastructure', riskProfile: 'Med', dividendYield: '0.6%' },
    { symbol: 'KNRCON', name: 'KNR Constructions', sector: 'Infrastructure', why: 'Roads, irrigation, EPC', riskProfile: 'Med', dividendYield: '0.2%' },
    { symbol: 'PATELENG', name: 'Patel Engineering', sector: 'Infrastructure', why: 'Dams, tunnels, hydro', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'NCC', name: 'NCC Ltd', sector: 'Infrastructure', why: 'Diversified EPC, real estate', riskProfile: 'Med', dividendYield: '0.4%' },
    { symbol: 'GTLINFRA', name: 'GTL Infrastructure', sector: 'Infrastructure', why: 'Tower sharing, telecom infrastructure', riskProfile: 'High', dividendYield: '0%' },
  ],
  'Telecom': [
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom', why: 'Market leader, ARPU growth, 5G rollout', riskProfile: 'Low-Med', dividendYield: '0.5%' },
    { symbol: 'INDUSTOWER', name: 'Indus Towers', sector: 'Telecom', why: 'Tower infrastructure, tenancy growth', riskProfile: 'Med', dividendYield: '1.8%' },
    { symbol: 'TATACOMM', name: 'Tata Communications', sector: 'Telecom', why: 'Enterprise data, cloud services', riskProfile: 'Med', dividendYield: '1.2%' },
    { symbol: 'TEJASNET', name: 'Tejas Networks', sector: 'Telecom', why: 'Optical networking, 5G equipment', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'ITI', name: 'ITI Ltd', sector: 'Telecom', why: 'Telecom equipment, PSU', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'HFCL', name: 'HFCL Ltd', sector: 'Telecom', why: 'Fiber optic cables, 5G infrastructure', riskProfile: 'Med-High', dividendYield: '0.2%' },
    { symbol: 'STLTECH', name: 'Sterlite Technologies', sector: 'Telecom', why: 'Optical fiber, network services', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'GTLINFRA', name: 'GTL Infrastructure', sector: 'Telecom', why: 'Tower sharing, telecom infrastructure', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'VODAFONEIDE', name: 'Vodafone Idea', sector: 'Telecom', why: 'Turnaround, 5G, government support', riskProfile: 'Very High', dividendYield: '0%' },
  ],
  'Materials': [
    { symbol: 'JSWSTEEL', name: 'JSW Steel', sector: 'Materials', why: 'Steel leader, capacity expansion, green steel', riskProfile: 'Med', dividendYield: '0.8%' },
    { symbol: 'HINDALCO', name: 'Hindalco Industries', sector: 'Materials', why: 'Aluminum play, Novelis integration', riskProfile: 'Med', dividendYield: '0.6%' },
    { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', sector: 'Materials', why: 'Cement leader, capacity expansion', riskProfile: 'Low-Med', dividendYield: '0.5%' },
    { symbol: 'TATASTEEL', name: 'Tata Steel', sector: 'Materials', why: 'European turnaround, India growth', riskProfile: 'Med', dividendYield: '2.5%' },
    { symbol: 'GRASIM', name: 'Grasim Industries', sector: 'Materials', why: 'Diversified, cement, paints entry', riskProfile: 'Low-Med', dividendYield: '0.4%' },
    { symbol: 'SHREECEM', name: 'Shree Cement', sector: 'Materials', why: 'Efficient cement player, north India', riskProfile: 'Low-Med', dividendYield: '0.3%' },
    { symbol: 'AMBUJACEM', name: 'Ambuja Cements', sector: 'Materials', why: 'Adani group, capacity expansion', riskProfile: 'Low-Med', dividendYield: '0.5%' },
    { symbol: 'ACC', name: 'ACC Ltd', sector: 'Materials', why: 'Adani group, cement, ready-mix', riskProfile: 'Low-Med', dividendYield: '0.6%' },
    { symbol: 'VEDL', name: 'Vedanta Ltd', sector: 'Materials', why: 'Diversified metals, oil, dividends', riskProfile: 'Med-High', dividendYield: '4.5%' },
    { symbol: 'NMDC', name: 'NMDC Ltd', sector: 'Materials', why: 'Iron ore mining, PSU dividend', riskProfile: 'Low-Med', dividendYield: '3.2%' },
    { symbol: 'SAIL', name: 'SAIL', sector: 'Materials', why: 'Steel PSU, capacity expansion', riskProfile: 'Med', dividendYield: '1.2%' },
    { symbol: 'JINDALSTEL', name: 'Jindal Steel', sector: 'Materials', why: 'Steel, power, mining', riskProfile: 'Med-High', dividendYield: '0.3%' },
    { symbol: 'PENTAGOLD', name: 'Penta Gold', sector: 'Materials', why: 'Gold jewelry, retail chain', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'EPIGRAL', name: 'Epigral Ltd', sector: 'Materials', why: 'Chlor-alkali, specialty chemicals', riskProfile: 'Med', dividendYield: '0.5%' },
  ],
  'Industrials': [
    { symbol: 'SIEMENS', name: 'Siemens India', sector: 'Industrials', why: 'Automation leader, digitalization play', riskProfile: 'Low-Med', dividendYield: '0.4%' },
    { symbol: 'ABB', name: 'ABB India', sector: 'Industrials', why: 'Power grids, robotics, electrification', riskProfile: 'Low-Med', dividendYield: '0.3%' },
    { symbol: 'HAL', name: 'Hindustan Aeronautics', sector: 'Industrials', why: 'Defense PSU, order book visibility', riskProfile: 'Med', dividendYield: '1.8%' },
    { symbol: 'KSB', name: 'KSB Ltd', sector: 'Industrials', why: 'Pumps, valves, industrial solutions', riskProfile: 'Low-Med', dividendYield: '0.8%' },
    { symbol: 'KIRLOSKAR', name: 'Kirloskar Brothers', sector: 'Industrials', why: 'Pumps, infrastructure, agriculture', riskProfile: 'Med', dividendYield: '1.2%' },
    { symbol: 'HPL_ELEC', name: 'HPL Electric', sector: 'Industrials', why: 'Switchgear, meters, LED lighting', riskProfile: 'Med', dividendYield: '0.5%' },
    { symbol: 'GENUS_POWER', name: 'Genus Power', sector: 'Industrials', why: 'Smart meters, power infrastructure', riskProfile: 'Med', dividendYield: '0.6%' },
    { symbol: 'MIRC_ELEC', name: 'Mirc Electronics', sector: 'Industrials', why: 'Consumer electronics, Onida brand', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'BEL', name: 'Bharat Electronics', sector: 'Industrials', why: 'Defense electronics, PSU', riskProfile: 'Low-Med', dividendYield: '1.2%' },
    { symbol: 'BHEL', name: 'BHEL', sector: 'Industrials', why: 'Power equipment, diversification', riskProfile: 'Med', dividendYield: '1.5%' },
    { symbol: 'CGPOWER', name: 'CG Power', sector: 'Industrials', why: 'Transformers, motors, Murugappa group', riskProfile: 'Low-Med', dividendYield: '0.4%' },
    { symbol: 'SHAKTIPUMPS', name: 'Shakti Pumps', sector: 'Industrials', why: 'Solar pumps, water solutions', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'SERVOTECH', name: 'Servotech Power', sector: 'Industrials', why: 'Power systems, EV charging', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'IDEAFORGE', name: 'IdeaForge', sector: 'Industrials', why: 'Drones, defense, surveillance', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'KAYNES', name: 'Kaynes Technology', sector: 'Industrials', why: 'EMS, PCB assembly, IoT', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'SYRMA', name: 'Syrma SGS', sector: 'Industrials', why: 'EMS, design, manufacturing', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'AVALON', name: 'Avalon Technologies', sector: 'Industrials', why: 'EMS, cable assembly, RF', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'PREMIER', name: 'Premier Energies', sector: 'Industrials', why: 'Solar cells, modules, EPC', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'JYOTI CNC', name: 'Jyoti CNC Automation', sector: 'Industrials', why: 'CNC machines, automation', riskProfile: 'High', dividendYield: '0%' },
  ],
  'Textiles': [
    { symbol: 'PAGEIND', name: 'Page Industries', sector: 'Textiles', why: 'Jockey franchise, premium innerwear', riskProfile: 'Low-Med', dividendYield: '0.8%' },
    { symbol: 'KPRMILL', name: 'K.P.R. Mill', sector: 'Textiles', why: 'Integrated textile, garment exports', riskProfile: 'Med', dividendYield: '0.6%' },
    { symbol: 'GOKEX', name: 'Gokaldas Exports', sector: 'Textiles', why: 'Apparel exports, global brands', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'RAYMOND', name: 'Raymond Ltd', sector: 'Textiles', why: 'Lifestyle brand, real estate pivot', riskProfile: 'Med', dividendYield: '0.4%' },
    { symbol: 'ARVIND', name: 'Arvind Ltd', sector: 'Textiles', why: 'Denim, fabrics, advanced materials', riskProfile: 'Med', dividendYield: '0.5%' },
    { symbol: 'TRIDENT', name: 'Trident Ltd', sector: 'Textiles', why: 'Towels, bedsheets, yarn', riskProfile: 'Med', dividendYield: '0.8%' },
    { symbol: 'WELSPUNIND', name: 'Welspun India', sector: 'Textiles', why: 'Home textiles, global retailers', riskProfile: 'Med', dividendYield: '0.6%' },
    { symbol: 'GOKALDAS', name: 'Gokaldas Exports', sector: 'Textiles', why: 'Apparel manufacturing, exports', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'INDOCOUNT', name: 'Indo Count Industries', sector: 'Textiles', why: 'Home textiles, exports', riskProfile: 'Med', dividendYield: '0.5%' },
  ],
  'Real Estate': [
    { symbol: 'DLF', name: 'DLF Ltd', sector: 'Real Estate', why: 'Largest developer, Gurugram focus', riskProfile: 'Med', dividendYield: '0.5%' },
    { symbol: 'OBEROIRLTY', name: 'Oberoi Realty', sector: 'Real Estate', why: 'Premium Mumbai developer', riskProfile: 'Low-Med', dividendYield: '0.3%' },
    { symbol: 'PRESTIGE', name: 'Prestige Estates', sector: 'Real Estate', why: 'South India developer, commercial', riskProfile: 'Med', dividendYield: '0.4%' },
    { symbol: 'GODREJPROP', name: 'Godrej Properties', sector: 'Real Estate', why: 'Brand strength, pan-India', riskProfile: 'Med', dividendYield: '0.2%' },
    { symbol: 'SOBHA', name: 'Sobha Ltd', sector: 'Real Estate', why: 'Bangalore focus, quality execution', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'BRIGADE', name: 'Brigade Enterprises', sector: 'Real Estate', why: 'South India, commercial, residential', riskProfile: 'Med', dividendYield: '0.2%' },
    { symbol: 'PHOENIXLTD', name: 'Phoenix Mills', sector: 'Real Estate', why: 'Malls, retail, mixed-use', riskProfile: 'Low-Med', dividendYield: '0.4%' },
    { symbol: 'MACROTECH', name: 'Macrotech Developers', sector: 'Real Estate', why: 'Lodha Group, Mumbai, London', riskProfile: 'Med', dividendYield: '0%' },
  ],
  'Media': [
    { symbol: 'ZEEL', name: 'Zee Entertainment', sector: 'Media', why: 'Broadcasting, content library', riskProfile: 'High', dividendYield: '0.5%' },
    { symbol: 'SUNTV', name: 'Sun TV Network', sector: 'Media', why: 'South India dominance, regional content', riskProfile: 'Low-Med', dividendYield: '2.5%' },
    { symbol: 'TV18BRDCST', name: 'TV18 Broadcast', sector: 'Media', why: 'News, entertainment networks', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'NETWORK18', name: 'Network18 Media', sector: 'Media', why: 'Digital, print, TV', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'PVRINOX', name: 'PVR Inox', sector: 'Media', why: 'Multiplex leader, post-COVID recovery', riskProfile: 'Med-High', dividendYield: '0%' },
    { symbol: 'SAREGAMA', name: 'Saregama India', sector: 'Media', why: 'Music, films, digital content', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'JUSTDIAL', name: 'Just Dial', sector: 'Media', why: 'Local search, B2B marketplace', riskProfile: 'Med', dividendYield: '0.5%' },
  ],
  'Conglomerate': [
    { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Conglomerate', why: 'Diversified conglomerate', riskProfile: 'Low-Med', dividendYield: '0.3%' },
    { symbol: 'TCS', name: 'Tata Consultancy', sector: 'Conglomerate', why: 'IT leader, defensive play', riskProfile: 'Low', dividendYield: '1.4%' },
    { symbol: 'ADANIENT', name: 'Adani Enterprises', sector: 'Conglomerate', why: 'Airports, roads, data centers', riskProfile: 'Med-High', dividendYield: '0.1%' },
    { symbol: 'TORNTPHARM', name: 'Torrent Pharma', sector: 'Conglomerate', why: 'Pharma, power', riskProfile: 'Low-Med', dividendYield: '1.2%' },
    { symbol: 'MAHINDCIE', name: 'Mahindra CIE', sector: 'Conglomerate', why: 'Auto components, forging', riskProfile: 'Med', dividendYield: '0.8%' },
  ],
  'Utilities': [
    { symbol: 'NTPC', name: 'NTPC Ltd', sector: 'Utilities', why: 'Power generation leader, green transition', riskProfile: 'Low-Med', dividendYield: '2.8%' },
    { symbol: 'POWERGRID', name: 'Power Grid Corp', sector: 'Utilities', why: 'Monopoly transmission, stable dividends', riskProfile: 'Low', dividendYield: '3.5%' },
    { symbol: 'NHPC', name: 'NHPC Ltd', sector: 'Utilities', why: 'Hydro power, renewable expansion', riskProfile: 'Low', dividendYield: '2.5%' },
    { symbol: 'TATAPOWER', name: 'Tata Power', sector: 'Utilities', why: 'Renewable pivot, distribution', riskProfile: 'Med', dividendYield: '0.8%' },
    { symbol: 'ADANIPOWER', name: 'Adani Power', sector: 'Utilities', why: 'Thermal power, capacity expansion', riskProfile: 'Med-High', dividendYield: '0%' },
    { symbol: 'JSWENERGY', name: 'JSW Energy', sector: 'Utilities', why: 'Renewable power, green hydrogen', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'TORNTPOWER', name: 'Torrent Power', sector: 'Utilities', why: 'Ahmedabad, Surat distribution', riskProfile: 'Low-Med', dividendYield: '1.2%' },
    { symbol: 'CESC', name: 'CESC Ltd', sector: 'Utilities', why: 'Kolkata distribution, retail', riskProfile: 'Low-Med', dividendYield: '2.5%' },
  ],
  'Consumer Services': [
    { symbol: 'ZOMATO', name: 'Zomato Ltd', sector: 'Consumer Services', why: 'Food delivery, quick commerce, Hyperpure', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'NYKAA', name: 'FSN E-Commerce (Nykaa)', sector: 'Consumer Services', why: 'Beauty, fashion, BPC marketplace', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'SWIGGY', name: 'Swiggy Ltd', sector: 'Consumer Services', why: 'Food delivery, Instamart, Dineout', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'EASEMYTRIP', name: 'Easy Trip Planners', sector: 'Consumer Services', why: 'Travel booking, low capex model', riskProfile: 'Med', dividendYield: '0.5%' },
    { symbol: 'MMT', name: 'MakeMyTrip', sector: 'Consumer Services', why: 'Travel leader, hotels, flights', riskProfile: 'Med', dividendYield: '0%' },
    { symbol: 'IXIGO', name: 'Le Travenues (Ixigo)', sector: 'Consumer Services', why: 'Travel app, trains, flights, buses', riskProfile: 'Med', dividendYield: '0%' },
    { symbol: 'NAUKRI', name: 'Info Edge (Naukri)', sector: 'Consumer Services', why: 'Jobs, 99acres, Jeevansathi, Shiksha', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'INDIAMART', name: 'IndiaMART', sector: 'Consumer Services', why: 'B2B marketplace, SME focus', riskProfile: 'Med', dividendYield: '0.2%' },
  ],
  'Logistics': [
    { symbol: 'DELHIVERY', name: 'Delhivery Ltd', sector: 'Logistics', why: 'E-commerce logistics, supply chain', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'BLUEDART', name: 'Blue Dart Express', sector: 'Logistics', why: 'Premium courier, DHL partnership', riskProfile: 'Low-Med', dividendYield: '0.8%' },
    { symbol: 'TCI', name: 'Transport Corp of India', sector: 'Logistics', why: 'Integrated logistics, warehousing', riskProfile: 'Low-Med', dividendYield: '1.2%' },
    { symbol: 'VRLLOG', name: 'VRL Logistics', sector: 'Logistics', why: 'Road transport, courier, goods', riskProfile: 'Med', dividendYield: '0.5%' },
    { symbol: 'ALLCARGO', name: 'Allcargo Logistics', sector: 'Logistics', why: 'Container freight, warehousing', riskProfile: 'Med', dividendYield: '0.6%' },
    { symbol: 'MAHLOG', name: 'Mahindra Logistics', sector: 'Logistics', why: '3PL, supply chain, Mahindra group', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'AEGISLOG', name: 'Aegis Logistics', sector: 'Logistics', why: 'Oil & gas logistics, terminals', riskProfile: 'Low-Med', dividendYield: '1.0%' },
    { symbol: 'GATI', name: 'Gati Ltd', sector: 'Logistics', why: 'Express distribution, e-commerce', riskProfile: 'Med-High', dividendYield: '0%' },
  ],
  'Others': [
    { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Others', why: 'Diversified conglomerate', riskProfile: 'Low-Med', dividendYield: '0.3%' },
    { symbol: 'TCS', name: 'Tata Consultancy', sector: 'Others', why: 'IT leader, defensive play', riskProfile: 'Low', dividendYield: '1.4%' },
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Others', why: 'Diversified market exposure', riskProfile: 'Low', dividendYield: '1.2%' },
    { symbol: 'JUNIORBEES', name: 'Nifty Next 50 ETF', sector: 'Others', why: 'Mid-cap exposure', riskProfile: 'Low-Med', dividendYield: '1.0%' },
  ],
};

const SECTOR_ETFS: Record<string, SectorAlternative[]> = {
  'Financial Services': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Financial Services', why: 'Diversified large-cap exposure via ETF', riskProfile: 'Low', dividendYield: '1.2%' },
    { symbol: 'BANKBEES', name: 'Bank Nifty ETF', sector: 'Financial Services', why: 'Banking sector ETF', riskProfile: 'Med', dividendYield: '1.0%' },
  ],
  'IT': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'IT', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
    { symbol: 'ITBEES', name: 'IT ETF', sector: 'IT', why: 'IT sector ETF', riskProfile: 'Low-Med', dividendYield: '0.8%' },
  ],
  'Technology': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Technology', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
    { symbol: 'ITBEES', name: 'IT ETF', sector: 'Technology', why: 'IT sector ETF', riskProfile: 'Low-Med', dividendYield: '0.8%' },
  ],
  'Energy': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Energy', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
    { symbol: 'GOLDBEES', name: 'Gold ETF', sector: 'Energy', why: 'Commodity hedge', riskProfile: 'Low', dividendYield: '0%' },
  ],
  'Healthcare': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Healthcare', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
    { symbol: 'PHARMABEES', name: 'Pharma ETF', sector: 'Healthcare', why: 'Pharma sector ETF', riskProfile: 'Low-Med', dividendYield: '0.8%' },
  ],
  'Automobile': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Automobile', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
    { symbol: 'AUTOBEES', name: 'Auto ETF', sector: 'Automobile', why: 'Auto sector ETF', riskProfile: 'Med', dividendYield: '0.6%' },
  ],
  'Jewellery': [
    { symbol: 'KALYANKJIL', name: 'Kalyan Jewellers', sector: 'Jewellery', why: 'Second largest jewellery retailer, franchise model', riskProfile: 'Med', dividendYield: '0.5%' },
    { symbol: 'SENCO', name: 'Senco Gold', sector: 'Jewellery', why: 'Eastern India jewellery retailer, rapid expansion', riskProfile: 'Med', dividendYield: '0.3%' },
    { symbol: 'PCJEWELLER', name: 'PC Jeweller', sector: 'Jewellery', why: 'North India jewellery chain, turnaround story', riskProfile: 'High', dividendYield: '0%' },
    { symbol: 'TITAN', name: 'Titan Company', sector: 'Jewellery', why: 'Tanishq brand, largest jewellery retailer in India', riskProfile: 'Low-Med', dividendYield: '0.3%' },
  ],

  'Consumer Goods': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Consumer Goods', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
  ],
  'FMCG': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'FMCG', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
  ],
  'Infrastructure': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Infrastructure', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
    { symbol: 'INFRABEES', name: 'Infra ETF', sector: 'Infrastructure', why: 'Infrastructure sector ETF', riskProfile: 'Med', dividendYield: '0.8%' },
  ],
  'Telecom': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Telecom', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
  ],
  'Materials': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Materials', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
  ],
  'Industrials': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Industrials', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
  ],
  'Textiles': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Textiles', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
  ],
  'Real Estate': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Real Estate', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
    { symbol: 'SETFNN50', name: 'Nifty Next 50 ETF', sector: 'Real Estate', why: 'Mid-cap exposure', riskProfile: 'Low-Med', dividendYield: '1.0%' },
  ],
  'Media': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Media', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
  ],
  'Conglomerate': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Conglomerate', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
  ],
  'Utilities': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Utilities', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
  ],
  'Consumer Services': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Consumer Services', why: 'Diversified large-cap exposure via ETF', riskProfile: 'Low', dividendYield: '1.2%' },
    { symbol: 'JUNIORBEES', name: 'Nifty Next 50 ETF', sector: 'Consumer Services', why: 'Mid-cap exposure', riskProfile: 'Low-Med', dividendYield: '1.0%' },
  ],
  'Logistics': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Logistics', why: 'Diversified large-cap exposure via ETF', riskProfile: 'Low', dividendYield: '1.2%' },
  ],
  'Others': [
    { symbol: 'NIFTYBEES', name: 'Nifty 50 ETF', sector: 'Others', why: 'Diversified large-cap exposure', riskProfile: 'Low', dividendYield: '1.2%' },
    { symbol: 'JUNIORBEES', name: 'Nifty Next 50 ETF', sector: 'Others', why: 'Mid-cap exposure', riskProfile: 'Low-Med', dividendYield: '1.0%' },
  ],
};

export function getSectorAlternativesSync(
  sector: string,
  excludeSymbol: string
): SectorAlternative[] {
  const cleanExclude = excludeSymbol.replace(/\.(NS|BO)$/i, '');

  const hardcoded = HARDCODED_ALTERNATIVES[sector];
  if (hardcoded && hardcoded.length > 0) {
    const filtered = hardcoded.filter(a => a.symbol !== cleanExclude);
    if (filtered.length > 0) {
      return filtered.slice(0, 3);
    }
  }

  const etfs = SECTOR_ETFS[sector] || SECTOR_ETFS['Others'];
  return etfs.slice(0, 3);
}