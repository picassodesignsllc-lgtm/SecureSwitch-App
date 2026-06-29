/** ActivityFeed component: live notification list. */
export function ActivityFeed(items) {
  return `<article class="panel glass"><p class="kicker">Activity feed</p><ul class="activity-feed">${items.map((item) => `<li><span></span>${item}</li>`).join('')}</ul></article>`;
}
