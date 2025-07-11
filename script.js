/**
 * Ultra-Robust Slideshow Class with:
 * - Auto-play/pause
 * - Navigation controls
 * - Dot indicators
 * - Keyboard/touch support
 * - Performance optimizations
 * - Graceful degradation
 * - Memory management
 */
class Slideshow {
  constructor(options = {}) {
    // Configuration with defaults
    this.config = Object.assign({
      autoPlay: true,
      autoPlayDelay: 8000,
      transitionDuration: 1450,
      pauseOnHover: false,
      pauseOnInteraction: true,
      showControlsOnHover: true,
      controlsTimeout: 10000,
      swipeThreshold: 50,
      keyboardNavigation: true,
      debug: false
    }, options);

    // State management
    this.currentSlide = 0;
    this.slideInterval = null;
    this.interactionTimeout = null;
    this.transitionInProgress = false;
    this.isUserInteracting = false;
    this.controlsVisible = false;
    this.touchStartX = 0;
    this.touchEndX = 0;

    // DOM elements
    this.slides = [];
    this.dots = [];
    this.prevBtn = null;
    this.nextBtn = null;
    this.dotsContainer = null;
    this.slideContainer = null;
    this.heroSection = null;

    // Initialize
    this.cacheDOM();
    this.initSlideshow();
  }

  /**
   * Cache DOM elements and verify required elements exist
   */
  cacheDOM() {
    this.slides = Array.from(document.querySelectorAll('.slide'));
    this.dots = Array.from(document.querySelectorAll('.dot'));
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.dotsContainer = document.querySelector('.dots-container');
    this.slideContainer = document.querySelector('.slideshow-container');
    this.heroSection = document.querySelector('.hero-section');

    // Validate required elements
    if (this.slides.length === 0) {
      this.log('No slides found - slideshow disabled', 'warn');
      return;
    }

    // Validate dots count matches slides count
    if (this.dots.length !== this.slides.length) {
      this.log(`Mismatch: ${this.slides.length} slides but ${this.dots.length} dots`, 'warn');
    }
  }

  /**
   * Initialize slideshow with proper state
   */
  initSlideshow() {
    // Set initial slide
    this.showSlide(this.currentSlide, false);

    // Setup all event listeners
    this.setupEventListeners();

    // Start auto-play if enabled
    if (this.config.autoPlay) {
      this.startAutoPlay();
    }

    this.log(`Slideshow initialized with ${this.slides.length} slides`);
  }

  /**
   * Setup all event listeners with proper cleanup references
   */
  setupEventListeners() {
    // Button navigation
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', this.handlePrevClick.bind(this));
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', this.handleNextClick.bind(this));
    }

    // Dot navigation
    this.dots.forEach((dot, index) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleDotClick(index);
      });
    });

    // Keyboard navigation
    if (this.config.keyboardNavigation) {
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    // Touch/swipe support
    if (this.slideContainer) {
      this.slideContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
      this.slideContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }

    // Mouse interactions for controls visibility
    if (this.config.showControlsOnHover && this.heroSection) {
      this.heroSection.addEventListener('mousemove', this.handleMouseMove.bind(this));
      this.heroSection.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    }

    // Pause on hover
    if (this.config.pauseOnHover && this.heroSection) {
      this.heroSection.addEventListener('mouseenter', this.pauseAutoPlay.bind(this));
      this.heroSection.addEventListener('mouseleave', this.resumeAutoPlay.bind(this));
    }

    // Visibility change handling
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Window resize handling
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Show specific slide with animation control
   */
  showSlide(index, animate = true) {
    // Prevent interference during transitions
    if (this.transitionInProgress) {
      this.log('Transition in progress - request ignored');
      return;
    }

    const newIndex = this.normalizeIndex(index);
    
    // Skip if already on this slide
    if (newIndex === this.currentSlide && animate) {
      return;
    }

    // Start transition
    this.transitionInProgress = true;
    this.currentSlide = newIndex;

    // Update slides visibility
    this.slides.forEach((slide, i) => {
      slide.classList.remove('active', 'fading-out');
      if (i === newIndex) {
        slide.classList.add('active');
      }
    });

    // Update dots state
    this.dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === newIndex);
    });

    // Complete transition after duration
    if (animate) {
      setTimeout(() => {
        this.transitionInProgress = false;
        this.dispatchEvent('slideChanged', { index: newIndex });
      }, this.config.transitionDuration);
    } else {
      this.transitionInProgress = false;
      this.dispatchEvent('slideChanged', { index: newIndex });
    }
  }

  /**
   * Navigation methods
   */
  nextSlide() {
    this.showSlide(this.currentSlide + 1);
  }

  prevSlide() {
    this.showSlide(this.currentSlide - 1);
  }

  goToSlide(index) {
    this.showSlide(index);
  }

  /**
   * Auto-play control methods
   */
  startAutoPlay() {
    this.stopAutoPlay();
    this.slideInterval = setInterval(() => {
      if (!this.isUserInteracting) {
        this.nextSlide();
      }
    }, this.config.autoPlayDelay);
    this.dispatchEvent('autoPlayStarted');
  }

  stopAutoPlay() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
      this.slideInterval = null;
      this.dispatchEvent('autoPlayStopped');
    }
  }

  pauseAutoPlay() {
    if (this.config.pauseOnInteraction) {
      this.isUserInteracting = true;
      this.stopAutoPlay();
      this.dispatchEvent('autoPlayPaused');
    }
  }

  resumeAutoPlay() {
    if (!this.isUserInteracting) {
      this.startAutoPlay();
      this.dispatchEvent('autoPlayResumed');
    }
  }

  /**
   * Controls visibility management
   */
  showControls() {
    if (this.controlsVisible) return;
    
    this.heroSection?.classList.remove('controls-hidden');
    this.controlsVisible = true;
    this.dispatchEvent('controlsShown');
    
    // Auto-hide after timeout
    this.resetControlsTimeout();
  }

  hideControls() {
    if (!this.controlsVisible) return;
    
    this.heroSection?.classList.add('controls-hidden');
    this.controlsVisible = false;
    this.dispatchEvent('controlsHidden');
  }

  resetControlsTimeout() {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    
    this.controlsTimeout = setTimeout(() => {
      this.hideControls();
    }, this.config.controlsTimeout);
  }

  /**
   * Event handlers
   */
  handlePrevClick(e) {
    e.preventDefault();
    this.handleUserInteraction();
    this.prevSlide();
  }

  handleNextClick(e) {
    e.preventDefault();
    this.handleUserInteraction();
    this.nextSlide();
  }

  handleDotClick(index) {
    this.handleUserInteraction();
    this.goToSlide(index);
  }

  handleKeyDown(e) {
    switch(e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        this.handleUserInteraction();
        this.prevSlide();
        break;
      case 'ArrowRight':
      case ' ':
        e.preventDefault();
        this.handleUserInteraction();
        this.nextSlide();
        break;
      case 'Escape':
        this.stopAutoPlay();
        break;
    }
  }

  handleTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
  }

  handleTouchEnd(e) {
    this.touchEndX = e.changedTouches[0].clientX;
    const diff = this.touchStartX - this.touchEndX;
    
    if (Math.abs(diff) > this.config.swipeThreshold) {
      this.handleUserInteraction();
      diff > 0 ? this.nextSlide() : this.prevSlide();
    }
  }

  handleMouseMove() {
    if (this.config.showControlsOnHover) {
      this.showControls();
    }
  }

  handleMouseLeave() {
    if (!this.isUserInteracting && this.config.autoPlay) {
      this.resumeAutoPlay();
    }
  }

  handleUserInteraction() {
    if (this.config.pauseOnInteraction) {
      this.isUserInteracting = true;
      this.stopAutoPlay();
      
      if (this.interactionTimeout) {
        clearTimeout(this.interactionTimeout);
      }
      
      this.interactionTimeout = setTimeout(() => {
        this.isUserInteracting = false;
        if (this.config.autoPlay) {
          this.startAutoPlay();
        }
      }, this.config.userInteractionDelay);
    }
    
    if (this.config.showControlsOnHover) {
      this.showControls();
    }
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.pauseAutoPlay();
    } else if (this.config.autoPlay) {
      this.resumeAutoPlay();
    }
  }

  handleResize() {
    // Handle any responsive behavior
    this.dispatchEvent('resized');
  }

  /**
   * Utility methods
   */
  normalizeIndex(index) {
    if (index >= this.slides.length) return 0;
    if (index < 0) return this.slides.length - 1;
    return index;
  }

  dispatchEvent(name, detail = {}) {
    if (this.config.debug) {
      this.log(`Event: ${name}`, 'debug', detail);
    }
    const event = new CustomEvent(`slideshow:${name}`, { detail });
    document.dispatchEvent(event);
  }

  log(message, level = 'log', data = null) {
    if (!this.config.debug && level === 'debug') return;
    
    const styles = {
      log: 'color: inherit;',
      warn: 'color: orange;',
      error: 'color: red;',
      debug: 'color: #888;'
    };
    
    console[level](`%c[Slideshow] ${message}`, styles[level], data || '');
  }

  /**
   * Public API
   */
  play() {
    this.config.autoPlay = true;
    this.startAutoPlay();
  }

  pause() {
    this.config.autoPlay = false;
    this.stopAutoPlay();
  }

  destroy() {
    // Clear all intervals and timeouts
    this.stopAutoPlay();
    
    if (this.interactionTimeout) {
      clearTimeout(this.interactionTimeout);
    }
    
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    
    // Remove all event listeners
    if (this.prevBtn) {
      this.prevBtn.removeEventListener('click', this.handlePrevClick);
    }
    
    if (this.nextBtn) {
      this.nextBtn.removeEventListener('click', this.handleNextClick);
    }
    
    this.dots.forEach(dot => {
      dot.removeEventListener('click', this.handleDotClick);
    });
    
    document.removeEventListener('keydown', this.handleKeyDown);
    
    if (this.slideContainer) {
      this.slideContainer.removeEventListener('touchstart', this.handleTouchStart);
      this.slideContainer.removeEventListener('touchend', this.handleTouchEnd);
    }
    
    if (this.heroSection) {
      this.heroSection.removeEventListener('mousemove', this.handleMouseMove);
      this.heroSection.removeEventListener('mouseleave', this.handleMouseLeave);
      this.heroSection.removeEventListener('mouseenter', this.pauseAutoPlay);
      this.heroSection.removeEventListener('mouseleave', this.resumeAutoPlay);
    }
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('resize', this.handleResize);
    
    this.dispatchEvent('destroyed');
  }
}

/**
 * Initialize slideshow with error handling
 */
function initSlideshow() {
  try {
    const slideshow = new Slideshow({
      debug: true // Set to false in production
    });
    
    // Expose to global scope if needed
    window.slideshow = slideshow;
    
    return slideshow;
  } catch (error) {
    console.error('Slideshow initialization failed:', error);
    return null;
  }
}

// Initialize when DOM is ready
if (document.readyState !== 'loading') {
  initSlideshow();
} else {
  document.addEventListener('DOMContentLoaded', initSlideshow);
}

// Navigation functionality
const navLinks = document.querySelectorAll('.nav-links a');
const navbar = document.getElementById('navbar');

// Function to update active nav link based on scroll position
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPosition = window.scrollY + 150; // Offset for better detection
    
    let currentSection = 'hero'; // Default to hero section
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });
    
    // Update nav links - remove active class from all, then add to current
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
}

// Smooth scrolling for navigation links
navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);
        
        if (targetSection) {
            targetSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
        
        // Update active nav link immediately
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
    });
});

// Listen for scroll events to update active nav link
window.addEventListener('scroll', updateActiveNavLink);

// Initialize active nav link on page load
document.addEventListener('DOMContentLoaded', function() {
    updateActiveNavLink();
});
// Dynamic Background Class (Modified for specific sections including socials)
class DynamicBackground {
  constructor() {
    this.background = document.getElementById('dynamicBackground');
    this.colorIntensity = 0;
    this.targetIntensity = 0;
    this.lastScrollY = window.scrollY;
    this.lastInteractionTime = 0;
    this.colorPalette = [
      '#3E321F00', // Fully transparent (0% opacity)
      '#3E3F2400', // Fully transparent (0% opacity)
      '#4A391F00', // Fully transparent (0% opacity)
      '#3A3D2200', // Fully transparent (0% opacity)
      '#3A261300', // Fully transparent (0% opacity)
      '#2E321900', // Fully transparent (0% opacity)
      '#4D453500', // Fully transparent (0% opacity)
      '#45483300'  // Fully transparent (0% opacity)
    ];

    this.backgroundVariants = [
      '#3E321F00', // Fully transparent
      '#3E3F2400', // Fully transparent
      '#4A391F00', // Fully transparent
      '#3A3D2200', // Fully transparent
      '#4D453500', // Fully transparent
      '#45483300'  // Fully transparent
    ];
    this.currentColor = this.colorPalette[0];
    this.activeSections = ['about', 'services', 'contact', 'socials-section', 'partners']; // Added socials-section class
    this.isActive = false;
    this.lastActiveState = false;
    
    this.init();
  }

  isInActiveSection() {
    const scrollPosition = window.scrollY + (window.innerHeight / 2);
    let currentSection = '';
    
    // Check sections with IDs
    document.querySelectorAll('section[id]').forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.id;
      
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        currentSection = sectionId;
      }
    });
    
    // Check for socials section by class if no ID section found
    if (!currentSection) {
      const socialsSection = document.querySelector('.socials-section');
      if (socialsSection) {
        const sectionTop = socialsSection.offsetTop;
        const sectionHeight = socialsSection.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          currentSection = 'socials-section';
        }
      }
    }
    
    return this.activeSections.includes(currentSection);
  }

  init() {
    // Set initial state to match the hero section
    this.background.style.transition = 'background-color 0.5s ease-out';
    this.background.style.backgroundColor = 'transparent';
    
    this.setupEventListeners();
    this.animate();
  }

  setupEventListeners() {
    // Scroll interaction (only in active sections)
    window.addEventListener('scroll', () => {
      const nowActive = this.isInActiveSection();
      if (nowActive !== this.isActive) {
        this.isActive = nowActive;
        if (!this.isActive) {
          // When leaving active section, smoothly transition to transparent
          this.targetIntensity = 0;
        }
      }

      if (this.isActive) {
        const scrollDelta = Math.abs(window.scrollY - this.lastScrollY);
        this.lastScrollY = window.scrollY;
        if (scrollDelta > 5) {
          this.boostIntensity(0.15 + Math.min(scrollDelta/100, 0.3));
        }
      }
    }, { passive: true });

    // Mouse movement (only in active sections)
    window.addEventListener('mousemove', (e) => {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const inActiveSection = elements.some(el => {
        const section = el.closest('section');
        if (!section) return false;
        
        // Check by ID first
        if (section.id && this.activeSections.includes(section.id)) {
          return true;
        }
        
        // Check by class for socials-section
        if (section.classList.contains('socials-section') && this.activeSections.includes('socials-section')) {
          return true;
        }
        
        return false;
      });
      
      if (inActiveSection) {
        this.boostIntensity(0.08);
      }
    });

    // Click/tap interaction (only in active sections)
    window.addEventListener('click', (e) => {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const inActiveSection = elements.some(el => {
        const section = el.closest('section');
        if (!section) return false;
        
        // Check by ID first
        if (section.id && this.activeSections.includes(section.id)) {
          return true;
        }
        
        // Check by class for socials-section
        if (section.classList.contains('socials-section') && this.activeSections.includes('socials-section')) {
          return true;
        }
        
        return false;
      });
      
      if (inActiveSection) {
        this.boostIntensity(0.25);
        this.rotateColor();
      }
    });

    // Touch interaction (only in active sections)
    window.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const inActiveSection = elements.some(el => {
        const section = el.closest('section');
        if (!section) return false;
        
        // Check by ID first
        if (section.id && this.activeSections.includes(section.id)) {
          return true;
        }
        
        // Check by class for socials-section
        if (section.classList.contains('socials-section') && this.activeSections.includes('socials-section')) {
          return true;
        }
        
        return false;
      });
      
      if (inActiveSection) {
        this.boostIntensity(0.3);
        this.rotateColor();
      }
    });

    // Form interactions (only in active sections)
    document.querySelectorAll('input, textarea, button').forEach(el => {
      const inActiveSection = this.activeSections.includes(el.closest('section')?.id);
      if (inActiveSection) {
        el.addEventListener('focus', () => this.boostIntensity(0.2));
        el.addEventListener('mouseenter', () => this.boostIntensity(0.15));
      }
    });
  }

  boostIntensity(amount) {
    this.targetIntensity = Math.min(0.6, this.targetIntensity + amount);
    this.lastInteractionTime = Date.now();
  }

  rotateColor() {
    const currentIndex = this.colorPalette.indexOf(this.currentColor);
    this.currentColor = this.colorPalette[(currentIndex + 1) % this.colorPalette.length];
  }

  animate() {
    // Check if we're entering or leaving an active section
    const currentActiveState = this.isInActiveSection();
    
    if (currentActiveState !== this.lastActiveState) {
      // State changed - handle transition
      if (currentActiveState) {
        // Entering active section - start with current values
        this.isActive = true;
      } else {
        // Leaving active section - smoothly fade out
        this.isActive = false;
        this.targetIntensity = 0;
      }
      this.lastActiveState = currentActiveState;
    }

    // Only update if in active section or fading out
    if (this.isActive || this.colorIntensity > 0) {
      // Fade out if no recent interaction
      if (Date.now() - this.lastInteractionTime > 1500) {
        this.targetIntensity = Math.max(0, this.targetIntensity - 0.01);
      }

      // Smooth intensity changes
      this.colorIntensity += (this.targetIntensity - this.colorIntensity) * 0.05;

      // Update background color
      const r1 = 10, g1 = 10, b1 = 10; // #0a0a0a
      const r2 = parseInt(this.currentColor.substring(1, 3), 16);
      const g2 = parseInt(this.currentColor.substring(3, 5), 16);
      const b2 = parseInt(this.currentColor.substring(5, 7), 16);
      
      const r = Math.floor(r1 + (r2 - r1) * this.colorIntensity);
      const g = Math.floor(g1 + (g2 - g1) * this.colorIntensity);
      const b = Math.floor(b1 + (b2 - b1) * this.colorIntensity);
      
      this.background.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
      
      // If we've faded out completely and are not active, set to transparent
      if (!this.isActive && this.colorIntensity < 0.01) {
        this.background.style.backgroundColor = 'transparent';
      }
    }
    
    requestAnimationFrame(() => this.animate());
  }
}

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observe all fade-in elements
document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
});

// Email submission handler
function handleEmailSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('heroEmail').value;
    
    if (email) {
        // Show success overlay
        document.getElementById('successOverlay').classList.add('show');
        document.getElementById('heroEmail').value = '';
        
        // Hide after 4 seconds
        setTimeout(() => {
            document.getElementById('successOverlay').classList.remove('show');
        }, 4000);
    }
}

// Contact form handler
function handleContactSubmit(event) {
    event.preventDefault();
    
    // Show success overlay
    document.getElementById('successOverlay').classList.add('show');
    event.target.reset();
    
    // Hide after 4 seconds
    setTimeout(() => {
        document.getElementById('successOverlay').classList.remove('show');
    }, 4000);
}

// Close success overlay on click
document.getElementById('successOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('show');
    }
});

// Initialize animations on load
window.addEventListener('load', function() {
    const heroSection = document.querySelector('.hero-section'); // Changed from .hero-content
    if (heroSection) {
        heroSection.classList.add('visible');
    } else {
        console.warn('Hero section element not found!');
    }
});

// Initialize Dynamic Background when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    new DynamicBackground();

    // Initialize text effects
    const initTextEffects = (selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.setAttribute('data-text', el.textContent);
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
            });
            el.addEventListener('mouseleave', () => {
                el.style.removeProperty('--mouse-x');
                el.style.removeProperty('--mouse-y');
            });
        });
    };
    
    initTextEffects('.section-title');
    initTextEffects('.hero-headline');
    initTextEffects('strong');
});
// Hamburger Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileLinks = document.querySelectorAll('.mobile-menu-links a');
    const desktopLinks = document.querySelectorAll('.nav-links a');
    const navbar = document.getElementById('navbar');

    if (!hamburger || !mobileMenu) return;

    // Function to toggle scroll lock
    function toggleScrollLock(enable) {
        if (enable) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        }
    }

    // Toggle mobile menu
    hamburger.addEventListener('click', function() {
        const isOpening = !mobileMenu.classList.contains('active');
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        toggleScrollLock(isOpening);
    });

    // Close mobile menu when clicking on links
    mobileLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            toggleScrollLock(false);
        });
    });

    // Handle active states for desktop links
    desktopLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            desktopLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Scroll effect for navbar
    window.addEventListener('scroll', function() {
        if (navbar) {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        }
    });

    // Close mobile menu on window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            toggleScrollLock(false);
        }
    });

    // Close mobile menu when clicking outside
    mobileMenu.addEventListener('click', function(e) {
        if (e.target === mobileMenu) {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            toggleScrollLock(false);
        }
    });
});

// Navbar scroll effect
window.addEventListener('scroll', function() {
    const navbar = document.getElementById('navbar');
    const navHeight = navbar.offsetHeight;
    const scrollPosition = window.scrollY + navHeight;
    const windowHeight = window.innerHeight;
    const documentHeight = document.body.scrollHeight;
    
    // Detect which section is active
    let current = '';
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        const sectionBottom = sectionTop + sectionHeight;
        
        if (scrollPosition >= sectionTop - 100 && scrollPosition < sectionBottom - 100) {
            current = section.getAttribute('id');
        }
    });

    // Special case for contact section at bottom of page
    if (window.scrollY + windowHeight >= documentHeight - 10) {
        current = 'contact';
    }

    // Update active nav links
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').substring(1) === current) {
            link.classList.add('active');
        }
    });
});

// Smooth scroll for Learn More button
document.addEventListener('DOMContentLoaded', function() {
    const learnMoreBtn = document.querySelector('.learn-more-btn');
    
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = document.querySelector('#about');
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const marqueeContent = document.querySelector('.marquee-content');
    const container = document.querySelector('.marquee-container');
    
    if (!marqueeContent || !container) return;
    
    // Store original content
    const originalContent = marqueeContent.innerHTML;
    
    // Double the content for seamless looping (simpler approach)
    marqueeContent.innerHTML = originalContent + originalContent;
    
    // Enhanced hover controls
    container.addEventListener('mouseenter', () => {
        marqueeContent.style.animationPlayState = 'paused';
    });
    
    container.addEventListener('mouseleave', () => {
        marqueeContent.style.animationPlayState = 'running';
    });
    
    console.log('Seamless marquee initialized');
});