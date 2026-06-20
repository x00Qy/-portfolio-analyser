import chalk from 'chalk';

// Assumed annual CAGR for projections
const BASE_RATE = 0.13;

export interface GoalPlanResult {
  currentValue: number;
  targetValue: number;
  targetYears: number;
  currentCAGR: number;
  requiredCAGR: number;
  monthlyNeeded: number;
  sipScenarios: SIPScenario[];
  milestones: Milestone[];
  verdict: 'ON_TRACK' | 'NEEDS_SIP' | 'NEEDS_MORE_SIP' | 'UNREALISTIC';
  verdictMessage: string;
  projectionWithSIP: SIPProjection[];
  wealthRoadmap: WealthMilestone[];
}

export interface SIPScenario {
  monthlySIP: number;
  yearsToGoal: number;
  finalValue: number;
  totalInvested: number;
  wealthCreated: number;
}

export interface Milestone {
  amount: number;
  label: string;
  yearsAway: number;
  dateAchieved: string;
  withSIP: number;
}

export interface WealthMilestone {
  target: number;
  label: string;
  achieved: boolean;
  yearsAwayNoSIP: number;
  yearsAwaySIP10k: number;
  dateNoSIP: string;
  dateSIP10k: string;
  sipNeededIn7Y: number;
  sipNeededIn10Y: number;
}

export interface SIPProjection {
  year: number;
  withoutSIP: number;
  withSIP5k: number;
  withSIP10k: number;
  withSIP20k: number;
}

function futureValue(principal: number, rate: number, years: number): number {
  return principal * Math.pow(1 + rate, years);
}

function futureValueSIP(monthly: number, annualRate: number, years: number): number {
  if (years <= 0 || monthly <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

function yearsToTarget(current: number, monthly: number, annualRate: number, target: number): number {
  if (current >= target) return 0;
  for (let years = 0.25; years <= 50; years += 0.25) {
    const corpus = futureValue(current, annualRate, years) + futureValueSIP(monthly, annualRate, years);
    if (corpus >= target) return years;
  }
  return 50;
}

function requiredSIP(current: number, annualRate: number, years: number, target: number): number {
  if (annualRate <= 0) {
    const remaining = target - current;
    return remaining > 0 ? remaining / (years * 12) : 0;
  }
  const corpusFromCurrent = futureValue(current, annualRate, years);
  const remaining = target - corpusFromCurrent;
  if (remaining <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  return remaining / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
}

export function fmt(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function pickGoalTarget(currentValue: number, customTarget?: number): number {
  if (customTarget && customTarget > currentValue) return customTarget;
  const tiers = [10000000, 50000000, 100000000, 200000000];
  for (const tier of tiers) {
    if (currentValue < tier) return tier;
  }
  return 200000000;
}

// FIX: Simple signature matching what index.ts calls:
// runGoalPlanner(currentValue, goalTarget, goalYears, 0, totalTaxBenefit)
export function runGoalPlanner(
  currentValue: number,
  targetValue: number,
  years: number,
  inflation: number,
  taxBenefit: number
): GoalPlanResult {
  const effectiveTarget = pickGoalTarget(currentValue, targetValue);

  let requiredCAGR = 0;
  for (let r = 0.01; r <= 1.0; r += 0.001) {
    if (futureValue(currentValue, r, years) >= effectiveTarget) {
      requiredCAGR = r;
      break;
    }
  }

  const projectedWithNoSIP = futureValue(currentValue, BASE_RATE, years);

  const monthlyNeeded = Math.max(0, requiredSIP(currentValue, BASE_RATE, years, effectiveTarget));

  const sipAmounts = [5000, 10000, 20000, 50000];
  const sipScenarios: SIPScenario[] = sipAmounts.map(sip => {
    const yearsToGoal = yearsToTarget(currentValue, sip, BASE_RATE, effectiveTarget);
    const finalValue = futureValue(currentValue, BASE_RATE, yearsToGoal) + futureValueSIP(sip, BASE_RATE, yearsToGoal);
    const totalInvested = currentValue + sip * 12 * yearsToGoal;
    return {
      monthlySIP: sip,
      yearsToGoal: Math.round(yearsToGoal * 4) / 4,
      finalValue,
      totalInvested,
      wealthCreated: finalValue - totalInvested,
    };
  });

  const milestoneAmounts = [2500000, 5000000, 7500000, 10000000, 15000000, 20000000];
  const milestones: Milestone[] = milestoneAmounts
    .filter(m => m >= currentValue)
    .map(amount => {
      const yearsAway = yearsToTarget(currentValue, 10000, BASE_RATE, amount);
      const date = new Date();
      date.setFullYear(date.getFullYear() + Math.floor(yearsAway));
      return {
        amount,
        label: amount >= 10000000 ? `₹${amount / 10000000}Cr` : `₹${amount / 100000}L`,
        yearsAway: Math.round(yearsAway * 2) / 2,
        dateAchieved: date.getFullYear().toString(),
        withSIP: futureValue(currentValue, BASE_RATE, yearsAway) + futureValueSIP(10000, BASE_RATE, yearsAway),
      };
    })
    .slice(0, 5);

  const projectionWithSIP: SIPProjection[] = [];
  for (let y = 0; y <= Math.max(years, 10); y++) {
    projectionWithSIP.push({
      year: new Date().getFullYear() + y,
      withoutSIP: futureValue(currentValue, BASE_RATE, y),
      withSIP5k: futureValue(currentValue, BASE_RATE, y) + futureValueSIP(5000, BASE_RATE, y),
      withSIP10k: futureValue(currentValue, BASE_RATE, y) + futureValueSIP(10000, BASE_RATE, y),
      withSIP20k: futureValue(currentValue, BASE_RATE, y) + futureValueSIP(20000, BASE_RATE, y),
    });
  }

  const allTiers = [
    { target: 10000000, label: '₹1Cr' },
    { target: 50000000, label: '₹5Cr' },
    { target: 100000000, label: '₹10Cr' },
    { target: 200000000, label: '₹20Cr' },
  ];

  const currentYear = new Date().getFullYear();
  const wealthRoadmap: WealthMilestone[] = allTiers.map(tier => {
    const achieved = currentValue >= tier.target;
    const yearsNoSIP = achieved ? 0 : yearsToTarget(currentValue, 0, BASE_RATE, tier.target);
    const yearsSIP10k = achieved ? 0 : yearsToTarget(currentValue, 10000, BASE_RATE, tier.target);
    const sipIn7Y = achieved ? 0 : Math.max(0, requiredSIP(currentValue, BASE_RATE, 7, tier.target));
    const sipIn10Y = achieved ? 0 : Math.max(0, requiredSIP(currentValue, BASE_RATE, 10, tier.target));
    return {
      target: tier.target,
      label: tier.label,
      achieved,
      yearsAwayNoSIP: Math.round(yearsNoSIP * 2) / 2,
      yearsAwaySIP10k: Math.round(yearsSIP10k * 2) / 2,
      dateNoSIP: achieved ? 'Done!' : (currentYear + Math.floor(yearsNoSIP)).toString(),
      dateSIP10k: achieved ? 'Done!' : (currentYear + Math.floor(yearsSIP10k)).toString(),
      sipNeededIn7Y: Math.round(sipIn7Y),
      sipNeededIn10Y: Math.round(sipIn10Y),
    };
  });

  // Find last achieved tier for correct "Already past" message
  const lastAchieved = allTiers.filter(t => currentValue >= t.target).pop();
  const nextUnachieved = allTiers.find(t => currentValue < t.target);

  let verdict: GoalPlanResult['verdict'];
  let verdictMessage: string;

  if (currentValue >= effectiveTarget) {
    verdict = 'ON_TRACK';
    if (lastAchieved && nextUnachieved) {
      verdictMessage = `🎉 Already past ${lastAchieved.label}! Next target: ${nextUnachieved.label}`;
    } else if (lastAchieved) {
      verdictMessage = `🎉 Already past ${lastAchieved.label}! All targets achieved.`;
    } else {
      verdictMessage = `🎉 Already past ${fmt(effectiveTarget)}! Next target: ${fmt(pickGoalTarget(effectiveTarget))}`;
    }
  } else if (monthlyNeeded === 0) {
    verdict = 'ON_TRACK';
    verdictMessage = `🎉 You're already on track to reach ${fmt(effectiveTarget)} in ${years} years through growth alone — no SIP needed.`;
  } else if (monthlyNeeded <= 10000) {
    verdict = 'NEEDS_SIP';
    verdictMessage = `📈 A SIP of just ${fmt(monthlyNeeded)}/month gets you to ${fmt(effectiveTarget)} in ${years} years.`;
  } else if (monthlyNeeded <= 50000) {
    verdict = 'NEEDS_MORE_SIP';
    verdictMessage = `💪 You need ₹${Math.round(monthlyNeeded).toLocaleString('en-IN')}/month SIP to hit ${fmt(effectiveTarget)} in ${years} years.`;
  } else {
    verdict = 'UNREALISTIC';
    verdictMessage = `⚠ ${fmt(effectiveTarget)} in ${years} years needs ₹${Math.round(monthlyNeeded).toLocaleString('en-IN')}/month. Consider extending the timeline.`;
  }

  return {
    currentValue,
    targetValue: effectiveTarget,
    targetYears: years,
    currentCAGR: BASE_RATE,
    requiredCAGR,
    monthlyNeeded,
    sipScenarios,
    milestones,
    verdict,
    verdictMessage,
    projectionWithSIP,
    wealthRoadmap,
  };
}

export function printGoalPlanner(result: GoalPlanResult) {
  const currentYear = new Date().getFullYear();

  console.log(chalk.white('\n ◆ WEALTH ROADMAP'));
  console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
  console.log(`  Current Portfolio: ${chalk.cyan(fmt(result.currentValue))}`);
  console.log();

  console.log(chalk.gray('┌──────────┬──────────────┬──────────────┬──────────────┬──────────────┐'));
  console.log(chalk.gray('│ Target   │   Status     │ No SIP (13%) │ +₹10K/mo SIP │ SIP for 10Y  │'));
  console.log(chalk.gray('├──────────┼──────────────┼──────────────┼──────────────┼──────────────┤'));

  for (const m of result.wealthRoadmap) {
    const statusText = m.achieved ? '✓ ACHIEVED   ' : m.target === result.targetValue ? '← NEXT TARGET' : 'future       ';
    const statusColored = m.achieved ? chalk.green(statusText) : m.target === result.targetValue ? chalk.yellow(statusText) : chalk.gray(statusText);
    const noSIP = m.achieved ? 'Done!        ' : `~${m.yearsAwayNoSIP}Y (${m.dateNoSIP})`.padEnd(13);
    const withSIP = m.achieved ? 'Done!        ' : `~${m.yearsAwaySIP10k}Y (${m.dateSIP10k})`.padEnd(13);
    const sipNeeded = m.achieved ? '₹0          ' : `₹${m.sipNeededIn10Y.toLocaleString('en-IN')}/mo`.padEnd(12);
    console.log(chalk.gray(`│ ${m.label.padEnd(8)} │ `) + statusColored + chalk.gray(` │ ${noSIP} │ ${withSIP} │ ${sipNeeded} │`));
  }
  console.log(chalk.gray('└──────────┴──────────────┴──────────────┴──────────────┴──────────────┘'));
  console.log();

  const nextTarget = result.wealthRoadmap.find(m => !m.achieved);
  if (nextTarget) {
    const vColor = result.verdict === 'ON_TRACK' ? chalk.green
      : result.verdict === 'NEEDS_SIP' ? chalk.cyan
      : result.verdict === 'NEEDS_MORE_SIP' ? chalk.yellow
      : chalk.red;
    console.log(vColor.bold(`  ${result.verdictMessage}`));
    console.log();
    console.log(chalk.white(`  To reach ${nextTarget.label}:`));
    console.log(`    Without SIP:      ${chalk.white(`~${nextTarget.yearsAwayNoSIP} years`)} (by ${nextTarget.dateNoSIP} at 13% CAGR)`);
    console.log(`    With ₹10K/mo:     ${chalk.cyan(`~${nextTarget.yearsAwaySIP10k} years`)} (by ${nextTarget.dateSIP10k})`);
    if (nextTarget.sipNeededIn7Y > 0)
      console.log(`    SIP for 7 years:  ${chalk.yellow(`₹${nextTarget.sipNeededIn7Y.toLocaleString('en-IN')}/month`)}`);
    if (nextTarget.sipNeededIn10Y > 0)
      console.log(`    SIP for 10 years: ${chalk.green(`₹${nextTarget.sipNeededIn10Y.toLocaleString('en-IN')}/month`)}`);
    console.log();
  }

  console.log(chalk.white('  Year-by-Year Projection:'));
  console.log(chalk.gray('  ┌──────┬──────────────┬──────────────┬──────────────┬──────────────┐'));
  console.log(chalk.gray('  │ Year │  No SIP      │  +₹5K/mo    │  +₹10K/mo   │  +₹20K/mo   │'));
  console.log(chalk.gray('  ├──────┼──────────────┼──────────────┼──────────────┼──────────────┤'));

  const showYears = [1, 2, 3, 5, 7, 10, 15, 20].filter(y => y <= result.projectionWithSIP.length - 1);
  for (const y of showYears) {
    const p = result.projectionWithSIP[y];
    if (!p) continue;
    const crossed = result.wealthRoadmap.find(m =>
      !m.achieved &&
      p.withSIP10k >= m.target &&
      (y === 1 || (result.projectionWithSIP[y - 1]?.withSIP10k || 0) < m.target)
    );
    const marker = crossed ? chalk.green(` ← ${crossed.label}!`) : '';
    console.log(`  │ ${p.year} │ ${fmt(p.withoutSIP).padStart(12)} │ ${fmt(p.withSIP5k).padStart(12)} │ ${chalk.cyan(fmt(p.withSIP10k)).padStart(12)} │ ${fmt(p.withSIP20k).padStart(12)} │${marker}`);
  }

  console.log(chalk.gray('  └──────┴──────────────┴──────────────┴──────────────┴──────────────┘'));
  console.log();
  console.log(chalk.gray('  * Projections assume 13% CAGR. Actual returns will vary.'));
  console.log();
  console.log(chalk.gray('═══════════════════════════════════════════════════════════════════════'));
  console.log();
}