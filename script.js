const sections = document.querySelectorAll('.page-section');
const buttons = document.querySelectorAll('.nav-button');
const feedList = document.getElementById('feed-list');
const eventList = document.getElementById('event-list');

const feedPosts = [
  {
    title: 'Loose dog near the south path',
    body: 'Spotted a friendly labrador near the dunes. Be careful if you have little ones.',
    category: 'General',
  },
  {
    title: 'Purple flag up at North Cove',
    body: 'Strong currents reported. Swim is not advised until lifeguards clear it.',
    category: 'Hazard Warning',
  },
  {
    title: 'Free surfboard fins',
    body: 'Two sets of fins left by the beach access. First come, first served.',
    category: 'Free Stuff',
  },
];

const events = [
  {
    title: 'Sunrise Beach Cleanup',
    time: 'Tomorrow • 7:00 AM',
    location: 'Boardwalk Beach',
    type: 'Cleanup',
  },
  {
    title: 'Family Sandcastle Contest',
    time: 'Saturday • 2:30 PM',
    location: 'North Cove',
    type: 'Family',
  },
];

function setActiveSection(sectionId) {
  sections.forEach((section) => {
    section.classList.toggle('hidden', section.id !== sectionId);
  });

  buttons.forEach((button) => {
    const active = button.dataset.section === sectionId;
    button.classList.toggle('active', active);
  });
}

function renderFeed() {
  feedList.innerHTML = feedPosts
    .map(
      (post) => `
        <article class="feed-item">
          <h3>${post.title}</h3>
          <p>${post.body}</p>
          <p><strong>Category:</strong> ${post.category}</p>
        </article>
      `
    )
    .join('');
}

function renderEvents() {
  eventList.innerHTML = events
    .map(
      (event) => `
        <article class="event-item">
          <h3>${event.title}</h3>
          <p>${event.time} • ${event.location}</p>
          <p><strong>Type:</strong> ${event.type}</p>
        </article>
      `
    )
    .join('');
}

buttons.forEach((button) => {
  button.addEventListener('click', () => setActiveSection(button.dataset.section));
});

renderFeed();
renderEvents();
setActiveSection('dashboard');
