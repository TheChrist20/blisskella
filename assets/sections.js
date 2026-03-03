/*
  © 2024 Blisskella
  https://www.Blisskella.com
*/

class Navbar extends HTMLElement {
  constructor () {
    super()

    this.handleDropdownsBackdrop()
    this.handleHeaderReveal()
    this.adjustOffcanvasMenu()
  }

  adjustOffcanvasMenu () {
    const offcanvasMenu = document.querySelector('#offcanvas-menu')
    const navbarMobile = document.querySelector('#navbar-mobile')

    offcanvasMenu?.addEventListener('show.bs.offcanvas', () => {
      const navbarSpacing = document.querySelector('#navbar-mobile').getBoundingClientRect().bottom
      offcanvasMenu.style.height = `${window.innerHeight - navbarSpacing}px`

      navbarMobile.querySelector('.svg-icon-menu')?.classList.add('svg-icon-menu-close')
    })

    offcanvasMenu?.addEventListener('hide.bs.offcanvas', () => {
      navbarMobile.querySelector('.svg-icon-menu')?.classList.remove('svg-icon-menu-close')
    })
  }

  handleHeaderReveal () {
    let oldScroll = window.scrollY
    const headerGroup = document.querySelector('#header-group')
    const navWrapper = this

    // Detect homepage. We treat the site's root path as the homepage.
    const path = (window.location && window.location.pathname) ? String(window.location.pathname).replace(/\/+$/,'') : '/'
    const isHome = (path === '' || path === '/')

    // 90vh threshold for navbar scrolled state (used on the homepage)
    let scrollThreshold = Math.round(window.innerHeight * 0.9)

    const updateScrollThreshold = () => {
      scrollThreshold = Math.round(window.innerHeight * 0.9)
    }

    const updateHeaderHeight = () => {
      if (headerGroup) {
        document.documentElement.style.setProperty('--header-height', headerGroup.clientHeight + 'px')
      }
    }

    // ensure variable is correct on load and resize
    updateHeaderHeight()
    window.addEventListener('resize', theme.debounce(updateHeaderHeight, 100))

    // If this is NOT the homepage we want the navbar to be dark by default
    // (user requested default black on all non-home pages). Apply the
    // scrolled appearance immediately and skip the 90vh toggle logic below.
    if (!isHome) {
      try {
        navWrapper.classList.add('navbar-scrolled')
        navWrapper.style.removeProperty('background')
        navWrapper.style.removeProperty('backdrop-filter')
        navWrapper.style.removeProperty('-webkit-backdrop-filter')
        navWrapper.querySelectorAll('.nav-link').forEach((el) => el.style.setProperty('color', '#000', 'important'))
        navWrapper.querySelectorAll('.svg-icon, .nav-link svg, .nav-link svg *').forEach((el) => {
          try { el.style.setProperty('stroke', '#000', 'important') } catch (e) {}
        })
        navWrapper.querySelectorAll('.navbar-brand, .navbar-logo img').forEach((el) => { try { el.style.removeProperty('filter') } catch (e) {} })
      } catch (e) {}
    }

    window.addEventListener('scroll', () => {
      const newScroll = window.scrollY
      if (newScroll > oldScroll) {
        if (newScroll > headerGroup.clientHeight) {
          headerGroup.classList.add('hide')
        }
      } else if (newScroll < oldScroll) {
        headerGroup.classList.remove('hide')
      }

      // adjust CSS variable so main padding drops when header hides
      const currentHeight = headerGroup.classList.contains('hide')
        ? 0
        : headerGroup.clientHeight
      document.documentElement.style.setProperty('--header-height', currentHeight + 'px')

      // Also toggle navbar-scrolled once the user passes 90vh (homepage only)
      try {
        if (isHome) {
          const shouldBeScrolled = window.scrollY > scrollThreshold
          navWrapper.classList.toggle('navbar-scrolled', shouldBeScrolled)

          if (shouldBeScrolled) {
            // apply blur background and force dark link/icon strokes
            navWrapper.style.setProperty('background', 'rgba(255,255,255,0.3)', 'important')
            navWrapper.style.setProperty('backdrop-filter', 'blur(10px)', 'important')
            navWrapper.style.setProperty('-webkit-backdrop-filter', 'blur(10px)', 'important')
            // set link color and svg stroke; avoid forcing fills so icon shape/negative-space remains
            navWrapper.querySelectorAll('.nav-link').forEach((el) => el.style.setProperty('color', '#000', 'important'))
            navWrapper.querySelectorAll('.svg-icon, .nav-link svg, .nav-link svg *').forEach((el) => {
              try { el.style.setProperty('stroke', '#000', 'important') } catch (e) {}
            })
            // ensure logo shows its original (dark) asset when scrolled
            navWrapper.querySelectorAll('.navbar-brand, .navbar-logo img').forEach((el) => {
              try { el.style.removeProperty('filter') } catch (e) {}
            })
          } else {
            // remove inline navbar background so top-of-page styling takes effect
            navWrapper.style.removeProperty('background')
            navWrapper.style.removeProperty('backdrop-filter')
            navWrapper.style.removeProperty('-webkit-backdrop-filter')
            // remove forced strokes / colors so CSS can control appearance
            navWrapper.querySelectorAll('.nav-link').forEach((el) => el.style.removeProperty('color'))
            navWrapper.querySelectorAll('.svg-icon, .nav-link svg, .nav-link svg *').forEach((el) => {
              try { el.style.removeProperty('stroke') } catch (e) {}
            })
            // force logo to invert (white) while at the top
            navWrapper.querySelectorAll('.navbar-brand, .navbar-logo img').forEach((el) => {
              try { el.style.setProperty('filter', 'brightness(0) invert(1)', 'important') } catch (e) {}
            })
          }
        }
      } catch (e) {
        // ignore DOM exceptions
      }

      oldScroll = Math.max(window.scrollY, 0)
    })

    // update threshold on resize
    window.addEventListener('resize', theme.debounce(() => {
      updateScrollThreshold()
      // re-evaluate scrolled state immediately after resize
      try {
        const shouldBeScrolled = window.scrollY > scrollThreshold
        navWrapper.classList.toggle('navbar-scrolled', shouldBeScrolled)
      } catch (e) {}
    }, 150))
  }

  handleDropdownsBackdrop () {
    this.querySelectorAll('#navbar-desktop .dropdown-toggle').forEach(dropdown => {
      dropdown.addEventListener('hidden.bs.dropdown', () => {
        if (!document.querySelector('#navbar-desktop .dropdown-toggle.show')) {
          document.body.classList.remove('navbar-dropdown-open')
        }
      })
      dropdown.addEventListener('show.bs.dropdown', () => {
        document.body.classList.add('navbar-dropdown-open')
      })
    })
  }
}
customElements.define('navbar-wrapper', Navbar)
