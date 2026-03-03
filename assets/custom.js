/*
  Wishlist
*/
(() => {
  const STORAGE_KEY = 'kt.wishlist.v1'
  const productCache = new Map()

  const getLocale = (path, fallback) => {
    const value = path.split('.').reduce((obj, key) => (obj && obj[key] ? obj[key] : null), window.theme?.locales)
    return value || fallback
  }

  const safeParse = (value) => {
    try {
      return JSON.parse(value)
    } catch (error) {
      return []
    }
  }

  const normalizeHandles = (value) => {
    if (!Array.isArray(value)) return []

    const cleanHandles = value
      .map(item => String(item || '').trim())
      .filter(Boolean)

    return [...new Set(cleanHandles)]
  }

  const escapeCssSelectorValue = (value) => {
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(value)
    }
    return String(value).replace(/"/g, '\\"')
  }

  const getWishlist = () => normalizeHandles(safeParse(window.localStorage.getItem(STORAGE_KEY)))

  const saveWishlist = (handles) => {
    const normalized = normalizeHandles(handles)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    return normalized
  }

  const hasHandle = (handle) => getWishlist().includes(handle)

  const addHandle = (handle) => {
    if (!handle) return false

    const handles = getWishlist()
    if (handles.includes(handle)) return true

    handles.push(handle)
    saveWishlist(handles)
    return true
  }

  const removeHandle = (handle) => {
    if (!handle) return false

    const handles = getWishlist().filter(item => item !== handle)
    saveWishlist(handles)
    return false
  }

  const toggleHandle = (handle) => {
    if (!handle) return false
    return hasHandle(handle) ? removeHandle(handle) : addHandle(handle)
  }

  const getButtonLabel = (active) => (
    active
      ? getLocale('wishlist.remove', 'Remove from wishlist')
      : getLocale('wishlist.add', 'Add to wishlist')
  )

  const updateWishlistButton = (button, active) => {
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', active ? 'true' : 'false')

    const label = getButtonLabel(active)
    button.setAttribute('aria-label', label)
    button.setAttribute('title', label)

    button.querySelectorAll('[data-wishlist-label]').forEach(labelElement => {
      labelElement.textContent = label
    })
  }

  const syncButtonsForHandle = (handle, forcedState = null) => {
    if (!handle) return

    const active = forcedState === null ? hasHandle(handle) : forcedState
    const escapedHandle = escapeCssSelectorValue(handle)

    document.querySelectorAll(`[data-wishlist-toggle][data-product-handle="${escapedHandle}"]`).forEach(button => {
      updateWishlistButton(button, active)
    })
  }

  const updateWishlistCounters = () => {
    const count = getWishlist().length

    document.querySelectorAll('[data-wishlist-count]').forEach(counter => {
      counter.textContent = count
      counter.hidden = count === 0
    })
  }

  const toggleWishlistEmptyState = (root = document) => {
    root.querySelectorAll('[data-wishlist-page]').forEach(page => {
      const list = page.querySelector('[data-wishlist-items]')
      const empty = page.querySelector('[data-wishlist-empty]')
      if (!list || !empty) return

      const hasItems = list.querySelectorAll('[data-wishlist-item]').length > 0
      empty.hidden = hasItems
    })
  }

  const bindWishlistButtons = (root = document) => {
    root.querySelectorAll('[data-wishlist-toggle]').forEach(button => {
      if (button.dataset.wishlistBound === 'true') return

      button.dataset.wishlistBound = 'true'

      button.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()

        const handle = button.dataset.productHandle
        const active = toggleHandle(handle)
        const wishlistItem = button.closest('[data-wishlist-item]')

        syncButtonsForHandle(handle, active)
        updateWishlistCounters()

        if (!active) {
          const escapedHandle = escapeCssSelectorValue(handle)
          document.querySelectorAll(`[data-wishlist-item][data-product-handle="${escapedHandle}"]`).forEach(item => {
            item.remove()
          })
          toggleWishlistEmptyState()

          if (!wishlistItem) {
            renderWishlistPage()
          }
          return
        }

        renderWishlistPage()
      })
    })
  }

  const escapeHtml = (value) => {
    const div = document.createElement('div')
    div.textContent = value
    return div.innerHTML
  }

  const createWishlistItemHtml = (product) => {
    const image = product.featured_image
      ? `<img src="${product.featured_image}" alt="${escapeHtml(product.title)}" loading="lazy">`
      : ''

    const price = window.Shopify.formatMoney(product.price)
    const compareAtPrice = product.compare_at_price && product.compare_at_price > product.price
      ? `<s class="product-card-price-compare">${window.Shopify.formatMoney(product.compare_at_price)}</s>`
      : ''

    return `
      <div class="wishlist-grid-item" data-wishlist-item data-product-handle="${product.handle}">
        <div class="product-card wishlist-product-card">
          <a href="${product.url}" class="product-card-link">
            <div class="product-card-img-wrapper">
              ${image}
            </div>
            <h3 class="product-card-title product-title fs-lg">${escapeHtml(product.title)}</h3>
            <div class="product-card-price">
              ${compareAtPrice}
              <span class="product-card-price-final">${price}</span>
            </div>
          </a>
          <div class="mt-4 d-grid">
            <button
              class="btn btn-outline-secondary btn-sm"
              type="button"
              data-wishlist-toggle
              data-product-handle="${product.handle}"
              data-product-id="${product.id}"
              data-product-url="${product.url}"
              aria-label="${getButtonLabel(true)}"
              title="${getButtonLabel(true)}">
              ${getButtonLabel(true)}
            </button>
          </div>
        </div>
      </div>
    `
  }

  const fetchProductByHandle = async (handle) => {
    if (productCache.has(handle)) {
      return productCache.get(handle)
    }

    try {
      const response = await fetch(`/products/${encodeURIComponent(handle)}.js`)
      if (!response.ok) return null
      const product = await response.json()
      productCache.set(handle, product)
      return product
    } catch (error) {
      return null
    }
  }

  const renderWishlistPage = async () => {
    const pages = document.querySelectorAll('[data-wishlist-page]')
    if (pages.length === 0) return

    const handles = getWishlist()
    const activeHandles = new Set(handles)

    for (const cachedHandle of productCache.keys()) {
      if (!activeHandles.has(cachedHandle)) {
        productCache.delete(cachedHandle)
      }
    }

    pages.forEach(page => {
      const list = page.querySelector('[data-wishlist-items]')
      const loading = page.querySelector('[data-wishlist-loading]')
      if (!list) return

      list.innerHTML = ''
      if (loading) loading.hidden = handles.length === 0
    })

    if (handles.length === 0) {
      toggleWishlistEmptyState()
      return
    }

    const products = (await Promise.all(handles.map(fetchProductByHandle))).filter(Boolean)

    pages.forEach(page => {
      const list = page.querySelector('[data-wishlist-items]')
      const loading = page.querySelector('[data-wishlist-loading]')
      if (!list) return

      products.forEach(product => {
        list.insertAdjacentHTML('beforeend', createWishlistItemHtml(product))
      })

      bindWishlistButtons(page)
      if (loading) loading.hidden = true
    })

    handles.forEach(handle => syncButtonsForHandle(handle))
    toggleWishlistEmptyState()
  }

  const initWishlist = async () => {
    bindWishlistButtons(document)

    document.querySelectorAll('[data-wishlist-toggle][data-product-handle]').forEach(button => {
      syncButtonsForHandle(button.dataset.productHandle)
    })

    updateWishlistCounters()
    await renderWishlistPage()
  }

  const bindMobileMenuWishlistLink = () => {
    document.querySelectorAll('[data-wishlist-open]').forEach(link => {
      if (link.dataset.wishlistMenuBound === 'true') return
      link.dataset.wishlistMenuBound = 'true'

      link.addEventListener('click', (event) => {
        event.preventDefault()

        const menuElement = document.querySelector('#offcanvas-menu')
        const wishlistElement = document.querySelector('#offcanvas-wishlist')
        if (!wishlistElement) return

        const wishlistOffcanvas = window.bootstrap?.Offcanvas.getOrCreateInstance(wishlistElement)
        if (!menuElement) {
          wishlistOffcanvas?.show()
          return
        }

        const menuOffcanvas = window.bootstrap?.Offcanvas.getOrCreateInstance(menuElement)
        menuElement.addEventListener('hidden.bs.offcanvas', () => wishlistOffcanvas?.show(), { once: true })
        menuOffcanvas?.hide()
      })
    })
  }

  document.addEventListener('DOMContentLoaded', initWishlist)
  document.addEventListener('DOMContentLoaded', bindMobileMenuWishlistLink)

  window.addEventListener('kt.collection.loaded', () => {
    bindWishlistButtons(document)
    bindMobileMenuWishlistLink()

    document.querySelectorAll('[data-wishlist-toggle][data-product-handle]').forEach(button => {
      syncButtonsForHandle(button.dataset.productHandle)
    })

    updateWishlistCounters()
  })

  window.addEventListener('kt.product.quick_view.modal_shown', () => {
    bindWishlistButtons(document)

    document.querySelectorAll('[data-wishlist-toggle][data-product-handle]').forEach(button => {
      syncButtonsForHandle(button.dataset.productHandle)
    })

    updateWishlistCounters()
  })

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return

    document.querySelectorAll('[data-wishlist-toggle][data-product-handle]').forEach(button => {
      syncButtonsForHandle(button.dataset.productHandle)
    })

    updateWishlistCounters()
    renderWishlistPage()
  })

  window.theme = window.theme || {}
  window.theme.wishlist = {
    get: getWishlist,
    has: hasHandle,
    add: addHandle,
    remove: removeHandle,
    toggle: toggleHandle,
    refresh: () => {
      document.querySelectorAll('[data-wishlist-toggle][data-product-handle]').forEach(button => {
        syncButtonsForHandle(button.dataset.productHandle)
      })
      updateWishlistCounters()
      renderWishlistPage()
    }
  }
})()
