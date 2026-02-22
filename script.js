/* ============================================================
   script.js — New Year Countdown
   Handles: timezone selection, countdown logic, 
            celebration trigger, and confetti animation.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Starting countdown...');

/* ============================================================
   TIMEZONE DATA
   ============================================================ */
const TIMEZONES = [
  { label: "Lagos / Abuja (WAT)",      tz: "Africa/Lagos"          },
  { label: "London (GMT/BST)",          tz: "Europe/London"         },
  { label: "New York (ET)",             tz: "America/New_York"      },
  { label: "Los Angeles (PT)",          tz: "America/Los_Angeles"   },
  { label: "Chicago (CT)",              tz: "America/Chicago"       },
  { label: "São Paulo (BRT)",           tz: "America/Sao_Paulo"     },
  { label: "Paris / Berlin (CET)",      tz: "Europe/Paris"          },
  { label: "Dubai (GST)",               tz: "Asia/Dubai"            },
  { label: "Nairobi (EAT)",             tz: "Africa/Nairobi"        },
  { label: "Accra / Dakar (GMT)",       tz: "Africa/Accra"          },
  { label: "Johannesburg (SAST)",       tz: "Africa/Johannesburg"   },
  { label: "Cairo (EET)",               tz: "Africa/Cairo"          },
  { label: "Mumbai / Delhi (IST)",      tz: "Asia/Kolkata"          },
  { label: "Singapore / KL (SGT)",      tz: "Asia/Singapore"        },
  { label: "Tokyo (JST)",               tz: "Asia/Tokyo"            },
  { label: "Sydney (AEST)",             tz: "Australia/Sydney"      },
  { label: "Auckland (NZST)",           tz: "Pacific/Auckland"      },
  { label: "Toronto (ET)",              tz: "America/Toronto"       },
  { label: "Vancouver (PT)",            tz: "America/Vancouver"     },
  { label: "Mexico City (CST)",         tz: "America/Mexico_City"   },
  { label: "Moscow (MSK)",              tz: "Europe/Moscow"         },
  { label: "Beijing / Shanghai (CST)",  tz: "Asia/Shanghai"         },
  { label: "Bangkok (ICT)",             tz: "Asia/Bangkok"          },
  { label: "Karachi (PKT)",             tz: "Asia/Karachi"          },
  { label: "Reykjavik (GMT)",           tz: "Atlantic/Reykjavik"    },
];


/* ============================================================
   DOM REFERENCES
   ============================================================ */
const tzSelect      = document.getElementById('tzSelect');
const daysEl        = document.getElementById('days');
const hoursEl       = document.getElementById('hours');
const minutesEl     = document.getElementById('minutes');
const secondsEl     = document.getElementById('seconds');
const celebrationEl = document.getElementById('celebration');
const welcomeYearEl = document.getElementById('welcomeYear');
const canvas        = document.getElementById('confetti-canvas');

// Check if all elements exist
console.log('Elements found:', {
  tzSelect: tzSelect ? '✓' : '✗',
  daysEl: daysEl ? '✓' : '✗',
  hoursEl: hoursEl ? '✓' : '✗',
  minutesEl: minutesEl ? '✓' : '✗',
  secondsEl: secondsEl ? '✓' : '✗',
  celebrationEl: celebrationEl ? '✓' : '✗',
  welcomeYearEl: welcomeYearEl ? '✓' : '✗',
  canvas: canvas ? '✓' : '✗'
});

if (!tzSelect) console.error('Missing tzSelect element!');
if (!daysEl) console.error('Missing days element!');
if (!hoursEl) console.error('Missing hours element!');
if (!minutesEl) console.error('Missing minutes element!');
if (!secondsEl) console.error('Missing seconds element!');

const ctx = canvas ? canvas.getContext('2d') : null;


/* ============================================================
   CONFETTI VARIABLES
   ============================================================ */
const CONFETTI_COLORS = [
  '#ff4d8d',   /* pink   */
  '#ffe033',   /* yellow */
  '#00e5ff',   /* cyan   */
  '#c44dff',   /* purple */
  '#3dff8f',   /* green  */
  '#ff7c2a',   /* orange */
  '#ffffff',   /* white  */
  '#ffaacc',   /* soft pink */
];

let particles      = [];    /* live particle objects */
let confettiActive = false; /* controls whether new particles spawn */
let animFrame      = null;  /* handle from requestAnimationFrame */


/* ============================================================
   CANVAS SETUP
   ============================================================ */

/* Make canvas fill the full viewport */
function resizeCanvas() {
  if (canvas) {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}
if (canvas) {
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
}


/* ============================================================
   TIMEZONE DROPDOWN — Build & Auto-detect
   ============================================================ */

if (tzSelect) {
  /* Detect the user's own timezone via the browser Intl API */
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let defaultIdx = 0;

  console.log('User timezone detected:', userTz);

  /* Populate the <select> from the TIMEZONES array */
  TIMEZONES.forEach((entry, i) => {
    const option       = document.createElement('option');
    option.value       = entry.tz;
    option.textContent = entry.label;
    if (entry.tz === userTz) {
      defaultIdx = i; /* mark user's tz as default */
      console.log('Default timezone set to:', entry.label);
    }
    tzSelect.appendChild(option);
  });

  tzSelect.selectedIndex = defaultIdx;
} else {
  console.error('Cannot populate timezone dropdown - element missing');
}


/* ============================================================
   COUNTDOWN CORE
   ============================================================ */

/* State */
let targetMs    = 0;      /* UTC ms timestamp of next New Year midnight */
let celebrated  = false;  /* guard so we only fire celebration once */
let prevSeconds = -1;     /* track last rendered second to skip no-change ticks */


/**
 * getMidnightUtc(year, tz)
 *
 * Returns the UTC timestamp (in ms) for Jan 1 00:00:00 of `year`
 * in the given IANA timezone.
 */
function getMidnightUtc(year, tz) {
  try {
    // Build the local midnight time string for Jan 1 of the target year
    const midnightString = `${year}-01-01T00:00:00`;

    // Use Intl to find the UTC offset for this timezone at that moment.
    const utcDate = new Date(midnightString + 'Z'); // force UTC parse

    // Format that UTC date in the target timezone to see the local time
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });

    const parts = fmt.formatToParts(utcDate);
    const get = (type) => parseInt(parts.find(p => p.type === type)?.value || '0');

    // Rebuild those local parts as a UTC number to find the offset
    const localAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    const offsetMs = localAsUtc - utcDate.getTime();

    // True UTC timestamp for local midnight = midnight UTC minus the offset
    return utcDate.getTime() - offsetMs;
  } catch (error) {
    console.error('Error in getMidnightUtc:', error);
    // Fallback to simple calculation
    const date = new Date(Date.UTC(year, 0, 1));
    return date.getTime();
  }
}


/**
 * updateTarget()
 * Recalculates targetMs when the timezone changes or on first load.
 * Also resets the celebration state.
 */
function updateTarget() {
  if (!tzSelect) {
    console.error('Cannot update target - tzSelect missing');
    return;
  }
  
  const tz  = tzSelect.value;
  const now = Date.now();

  // Always target Jan 1 of next calendar year (e.g. if it's 2026, target 2027)
  const nextYear = new Date().getFullYear() + 1;
  const t = getMidnightUtc(nextYear, tz);

  targetMs   = t;
  celebrated = false;

  if (celebrationEl) celebrationEl.classList.remove('show');
  stopConfetti();
  
  console.log('Target updated:', new Date(targetMs).toISOString(), 'for timezone:', tz);
  console.log('Current time:', new Date().toISOString());
  console.log('Time until target:', Math.floor((targetMs - Date.now()) / 1000), 'seconds');
}

/* Recalculate whenever the user picks a new timezone */
if (tzSelect) {
  tzSelect.addEventListener('change', function() {
    console.log('Timezone changed to:', tzSelect.value);
    updateTarget();
  });
}

/* Run once on load */
updateTarget();


/* ============================================================
   HELPERS
   ============================================================ */

/**
 * pad(n) — ensure numbers always display as 2 digits
 */
function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * setDigit(el, val)
 * Updates a digit card's text content and plays the bump animation.
 */
function setDigit(el, val) {
  if (el && el.textContent !== val) {
    el.textContent = val;
    el.classList.remove('bump');
    void el.offsetWidth;       /* force reflow to restart animation */
    el.classList.add('bump');
  }
}


/* ============================================================
   TICK — runs every 200ms via setInterval
   ============================================================ */
function tick() {
  // Make sure all required elements exist
  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) {
    console.error('Countdown elements missing in tick()');
    return;
  }
  
  const now  = Date.now();
  const diff = targetMs - now;   /* milliseconds left until New Year */

  /* ── If we've hit zero, trigger the celebration ── */
  if (diff <= 0) {
    if (!celebrated) celebrate();
    return;   /* no need to update digits anymore */
  }

  /* ── Break remaining time into days / hours / minutes / seconds ── */
  const totalSeconds = Math.floor(diff / 1000);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600) % 24;
  const d = Math.floor(totalSeconds / 86400);

  /* ── Only touch the DOM when the second has actually changed ── */
  if (s !== prevSeconds) {
    setDigit(daysEl,    pad(d));
    setDigit(hoursEl,   pad(h));
    setDigit(minutesEl, pad(m));
    setDigit(secondsEl, pad(s));
    prevSeconds = s;
    
    console.log('Countdown updated:', `${d}d ${h}h ${m}m ${s}s`);
  }
}

/* Tick every second (changed from 200ms to 1 second since we only need second precision) */
setInterval(tick, 1000);

/* Fire immediately so there's no blank flash on page load */
tick();


/* ============================================================
   CELEBRATION
   ============================================================ */

/**
 * celebrate()
 * Reveals the overlay, injects the correct year, and fires confetti.
 */
function celebrate() {
  celebrated = true;

  /* Get the year in the selected timezone at this exact moment */
  const year = new Intl.DateTimeFormat('en-US', {
    timeZone: tzSelect.value,
    year: 'numeric',
  }).format(new Date());

  if (welcomeYearEl) welcomeYearEl.textContent = `WELCOME TO ${year}`;
  if (celebrationEl) celebrationEl.classList.add('show');
  startConfetti();
  
  console.log('🎉 CELEBRATION! 🎉');
}


/* ============================================================
   CONFETTI FUNCTIONS
   ============================================================ */

/**
 * newParticle(scatter)
 * Creates one confetti particle.
 * scatter = true  → random Y (initial burst, fills screen instantly)
 * scatter = false → starts above screen top, falls naturally
 */
function newParticle(scatter) {
  if (!canvas) return null;
  
  return {
    x:     Math.random() * canvas.width,
    y:     scatter ? Math.random() * canvas.height : -20,
    w:     5  + Math.random() * 9,
    h:     9  + Math.random() * 13,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    vx:    (Math.random() - 0.5) * 2.5,   /* horizontal drift */
    vy:    1.5 + Math.random() * 4,        /* downward speed   */
    rot:   Math.random() * 360,            /* starting angle   */
    rotV:  (Math.random() - 0.5) * 7,     /* spin speed       */
  };
}


/**
 * startConfetti()
 * Seeds an initial burst and kicks off the animation loop.
 */
function startConfetti() {
  if (!canvas || !ctx) return;
  
  confettiActive = true;
  particles = Array.from({ length: 180 }, () => newParticle(true)).filter(p => p !== null);
  loopConfetti();
}


/**
 * stopConfetti()
 * Stops spawning new particles, cancels the animation frame,
 * and clears the canvas immediately.
 */
function stopConfetti() {
  confettiActive = false;
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  particles = [];
}


/**
 * loopConfetti()
 * Main animation loop — called once per frame.
 */
function loopConfetti() {
  if (!ctx || !canvas) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* Top up the particle count while confetti is active */
  if (confettiActive && particles.length < 320) {
    for (let i = 0; i < 4; i++) {
      const p = newParticle(false);
      if (p) particles.push(p);
    }
  }

  /* Update and draw every particle */
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x   += p.vx;
    p.y   += p.vy;
    p.rot += p.rotV;

    /* Recycle or remove once a particle falls off the bottom */
    if (p.y > canvas.height + 20) {
      if (confettiActive) {
        const newP = newParticle(false);
        if (newP) particles[i] = newP;   /* recycle: spawn a new one */
      } else {
        particles.splice(i, 1);              /* remove: let them drain out */
      }
      continue;
    }

    /* Draw as a rotated rectangle */
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot * Math.PI / 180);  /* degrees → radians */
    ctx.fillStyle   = p.color;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }

  /* Keep looping if there's anything left to draw */
  if (particles.length > 0 || confettiActive) {
    animFrame = requestAnimationFrame(loopConfetti);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

}); // End of DOMContentLoaded