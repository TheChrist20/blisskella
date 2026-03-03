/*
  © 2024 Blisskella
  https://www.Blisskella.com
*/

const getCollectionSearchQuery = () => {
  const value = new URLSearchParams(window.location.search).get('q') || ''
  return value.trim().toLowerCase()
}

const ensureCollectionSearchEmptyState = () => {
  let emptyState = document.querySelector('.collection-search-empty')
  if (emptyState) return emptyState

  emptyState = document.createElement('p')
  emptyState.className = 'collection-search-empty alert alert-primary mt-4'
  emptyState.setAttribute('hidden', 'hidden')
  document.querySelector('.collection-products .container')?.append(emptyState)
  return emptyState
}

const applyCollectionSearchFilter = () => {
  const query = getCollectionSearchQuery()
  const productList = document.querySelector('.collection-products .product-list')
  if (!productList) return

  const items = [...productList.querySelectorAll('[role="list-item"]')]
  let visibleCount = 0

  items.forEach(item => {
    const title = item.querySelector('.product-card-title')?.textContent?.trim().toLowerCase() || ''
    const visible = !query || title.includes(query)
    item.hidden = !visible
    if (visible) visibleCount += 1
  })

  const emptyState = ensureCollectionSearchEmptyState()
  const pagination = document.querySelector('.collection-pagination')

  if (query && visibleCount === 0) {
    emptyState.textContent = `No products found for "${query}"`
    emptyState.removeAttribute('hidden')
  } else {
    emptyState.setAttribute('hidden', 'hidden')
  }

  if (pagination) {
    pagination.hidden = Boolean(query)
  }
}

const loadCollection = async () => {
  const collectionProducts = document.querySelector('.collection-products')
  const productList = collectionProducts.querySelector('.product-list')
  const filters = document.querySelector('.collection-filters')

  if (productList) {
    productList.style.opacity = '.2'
  }

  const response = await fetch(window.location.href)
  const data = await response.text()
  const parser = new DOMParser()
  const newDocument = parser.parseFromString(data, 'text/html')

  collectionProducts?.replaceWith(newDocument.querySelector('.collection-products'))
  filters?.replaceWith(newDocument.querySelector('.collection-filters'))
  applyCollectionSearchFilter()

  window.dispatchEvent(new CustomEvent('kt.collection.loaded'))

  const newCollectionProducts = document.querySelector('.collection-products')
  const navbarHeight = document.querySelector('[id*="__navbar"].sticky-top')?.clientHeight || 0
  newCollectionProducts.style.scrollMarginTop = `${navbarHeight}px`
  newCollectionProducts.scrollIntoView()
}

class CollectionFilters extends HTMLElement {
  constructor () {
    super()

    this.form = this.querySelector('form')

    this.form.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', () => {
        const existingParams = new URLSearchParams(window.location.search)
        const params = new URLSearchParams(new FormData(this.form))
        const q = existingParams.get('q')

        if (q) {
          params.set('q', q)
        }

        const url = `${window.location.pathname}?${params.toString()}`
        window.history.replaceState({}, '', url)

        loadCollection()
      })
    })

    this.querySelectorAll('.btn-filters-clear-all').forEach(btn => {
      const params = new URLSearchParams(window.location.search)

      for (const key of params.keys()) {
        if (key.includes('filter.')) {
          btn.removeAttribute('hidden')
        }
      }

      btn.addEventListener('click', () => {
        for (const key of [...params.keys()]) {
          if (key.includes('filter.')) {
            params.delete(key)
          }
        }

        const url = `${window.location.pathname}?${params.toString()}`
        window.history.replaceState({}, '', url)
        loadCollection()
      })
    })
  }
}
customElements.define('collection-filters', CollectionFilters)

class CollectionSearch extends HTMLElement {
  constructor () {
    super()

    this.form = this.querySelector('form')
    this.input = this.form?.querySelector('input[name="q"]')
    this.syncWithUrl()

    this.form?.addEventListener('submit', (event) => {
      event.preventDefault()
      this.setUrlAndLoad()
    })

    this.input?.addEventListener('search', () => {
      this.setUrlAndLoad()
    })
  }

  syncWithUrl () {
    if (!this.input) return
    this.input.value = new URLSearchParams(window.location.search).get('q') || ''
  }

  setUrlAndLoad () {
    const params = new URLSearchParams(window.location.search)
    const value = (this.input?.value || '').trim()

    if (value) {
      params.set('q', value)
    } else {
      params.delete('q')
    }

    params.delete('page')
    const url = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, '', url)

    loadCollection()
  }
}
customElements.define('collection-search', CollectionSearch)

class SortBy extends HTMLElement {
  constructor () {
    super()

    this.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', () => {
        this.setUrl(input.value)
        loadCollection()
      })
    })
  }

  setUrl (value) {
    const params = new URLSearchParams(window.location.search)
    params.set('sort_by', value)
    params.delete('page')
    const url = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, '', url)
  }
}
customElements.define('sort-by', SortBy)

class Pagination extends HTMLElement {
  constructor () {
    super()

    this.querySelectorAll('a').forEach(elem => {
      elem.addEventListener('click', (event) => {
        event.preventDefault()

        this.setUrl(elem.dataset.newPage)
        loadCollection()
      })
    })
  }

  setUrl (value) {
    const params = new URLSearchParams(window.location.search)
    params.set('page', value)
    const url = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, '', url)
  }
}
customElements.define('collection-pagination', Pagination)

document.addEventListener('DOMContentLoaded', applyCollectionSearchFilter)
window.addEventListener('kt.collection.loaded', applyCollectionSearchFilter)
