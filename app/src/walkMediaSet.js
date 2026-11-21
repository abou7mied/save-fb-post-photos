// Walks a Facebook multi-photo media set starting from the first photo in the
// post so that feed collages with missing/reordered preview tiles still collect
// every photo in Facebook's canonical order.
//
// Only walks multi-photo sets (more than 1 photo in DOM, or a pcb.* post set)
// so a single photo belonging to a huge page album does not enumerate the whole
// album.

export default async function walkMediaSet(initialIds, setToken, fetchPhoto, maxSteps = 300) {
  if (!initialIds.length || !setToken) {
    return initialIds.slice();
  }
  const shouldWalk = initialIds.length > 1 || setToken.indexOf('pcb.') === 0;
  if (!shouldWalk) {
    return initialIds.slice();
  }

  const startId = initialIds[0];
  const walked = new Set([startId]);
  const forward = [startId];
  let wrapped = false;
  let cursor = startId;
  let steps = 0;

  while (cursor && steps < maxSteps) {
    steps += 1;
    let data;
    try {
      // eslint-disable-next-line no-await-in-loop
      data = await fetchPhoto(cursor, setToken);
    } catch (error) {
      break;
    }
    if (!data || !data.nextId) {
      break;
    }
    if (walked.has(data.nextId)) {
      wrapped = true;
      break;
    }
    walked.add(data.nextId);
    forward.push(data.nextId);
    cursor = data.nextId;
  }

  // If the set is linear (did not wrap around to an already-visited node),
  // walk backward from startId via prevId to pick up any earlier photos.
  const backward = [];
  if (!wrapped) {
    cursor = startId;
    while (cursor && steps < maxSteps) {
      steps += 1;
      let data;
      try {
        // eslint-disable-next-line no-await-in-loop
        data = await fetchPhoto(cursor, setToken);
      } catch (error) {
        break;
      }
      if (!data || !data.prevId || walked.has(data.prevId)) {
        break;
      }
      walked.add(data.prevId);
      backward.push(data.prevId);
      cursor = data.prevId;
    }
  }

  const ordered = backward.reverse().concat(forward);

  // Safety net: keep any DOM-discovered photo IDs that the walk did not reach.
  for (let i = 0; i < initialIds.length; i++) {
    if (!walked.has(initialIds[i])) {
      walked.add(initialIds[i]);
      ordered.push(initialIds[i]);
    }
  }

  return ordered;
}
