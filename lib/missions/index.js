// Mission progression rules. Pure functions.
export const eventKey = (type, target) => `${type}:${target}`;

export function objectiveDone(objective, done) {
  return !!done[eventKey(objective.type, objective.target)];
}

export function missionProgress(mission, done) {
  let required = 0, requiredDone = 0, optional = 0, optionalDone = 0;
  for (const o of mission.objectives) {
    const d = objectiveDone(o, done);
    if (o.required) { required++; if (d) requiredDone++; } else { optional++; if (d) optionalDone++; }
  }
  return { required, requiredDone, optional, optionalDone, complete: requiredDone === required };
}

export function nextObjective(mission, done) {
  return mission.objectives.find((o) => o.required && !objectiveDone(o, done)) || null;
}

/** A site can be used once its mission is unlocked (current or earlier). */
export function siteUnlocked(site, missionIndex) {
  return site.missionIndex <= missionIndex;
}

export function completionCriteria(mission) {
  return mission.objectives.filter((o) => o.required).map((o) => o.label);
}
