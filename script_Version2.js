// Simple static storefront: products.json, modal, cart in localStorage
const PRODUCTS_URL = 'products.json';

const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem('vp_cart') || '[]'),
  filter: 'All',
  search: '',
  sort: 'featured'
};

function $ (sel){ return document.querySelector(sel) }
function $all(sel){ return Array.from(document.querySelectorAll(sel)) }

function saveCart(){ localStorage.setItem('vp_cart', JSON.stringify(state.cart)); updateCartUI(); }

function updateCartUI(){
  const count = state.cart.reduce((s,i)=>s+i.qty,0);
  $('#cart-count').textContent = count;
  $('#cart-items').innerHTML = '';
  let total = 0;
  state.cart.forEach(item=>{
    total += item.price * item.qty;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div style="flex:1">
        <div style="font-weight:600">${item.name}</div>
        <div style="color:#666">Size: ${item.size} • ₹${item.price} × ${item.qty}</div>
        <div style="margin-top:6px">
          <button data-id="${item.id}" data-size="${item.size}" class="btn small dec">-</button>
          <button data-id="${item.id}" data-size="${item.size}" class="btn small inc">+</button>
          <button data-id="${item.id}" data-size="${item.size}" class="btn small remove">Remove</button>
        </div>
      </div>
    `;
    $('#cart-items').appendChild(div);
  });
  $('#cart-total').textContent = total.toFixed(0);

  // bind
  $all('.inc').forEach(b=>b.onclick = e=>{ changeQty(e.target.dataset.id, e.target.dataset.size, 1) });
  $all('.dec').forEach(b=>b.onclick = e=>{ changeQty(e.target.dataset.id, e.target.dataset.size, -1) });
  $all('.remove').forEach(b=>b.onclick = e=>{ removeFromCart(e.target.dataset.id, e.target.dataset.size) });
}

function changeQty(id, size, delta){
  const idx = state.cart.findIndex(i=>i.id==id && i.size==size);
  if(idx>-1){
    state.cart[idx].qty += delta;
    if(state.cart[idx].qty < 1) state.cart.splice(idx,1);
    saveCart();
  }
}

function removeFromCart(id, size){
  state.cart = state.cart.filter(i=>!(i.id==id && i.size==size));
  saveCart();
}

function addToCart(product, size){
  const existing = state.cart.find(i=>i.id==product.id && i.size==size);
  if(existing){ existing.qty += 1; }
  else {
    state.cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, size, qty: 1 });
  }
  saveCart();
}

// Products rendering
function renderProducts(){
  let list = state.products.slice();

  // filter
  if(state.filter && state.filter !== 'All'){
    list = list.filter(p=>p.category === state.filter);
  }

  // search
  if(state.search && state.search.trim()){
    const q = state.search.trim().toLowerCase();
    list = list.filter(p => (p.name + ' ' + p.short + ' ' + (p.category||'')).toLowerCase().includes(q));
  }

  // sort
  if(state.sort === 'price-asc') list.sort((a,b)=>a.price-b.price);
  if(state.sort === 'price-desc') list.sort((a,b)=>b.price-a.price);

  const container = $('#products');
  container.innerHTML = '';
  if(list.length === 0){
    container.innerHTML = '<p>No products found.</p>';
    return;
  }

  list.forEach(p=>{
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}">
      <h4>${p.name}</h4>
      <p>${p.short}</p>
      <div class="price">₹ ${p.price}</div>
      <div class="card-actions">
        <button class="btn view" data-id="${p.id}">View</button>
        <button class="btn primary quick-add" data-id="${p.id}">Add</button>
      </div>
    `;
    container.appendChild(card);
  });

  // bind
  $all('.view').forEach(b=>b.onclick = e=>{
    const p = state.products.find(x=>x.id==e.target.dataset.id);
    openModal(p);
  });
  $all('.quick-add').forEach(b=>b.onclick = e=>{
    const p = state.products.find(x=>x.id==e.target.dataset.id);
    addToCart(p, 'M');
  });
}

// modal
function openModal(p){
  $('#modal-img').src = p.image;
  $('#modal-title').textContent = p.name;
  $('#modal-desc').textContent = p.description;
  $('#modal-price').textContent = p.price;
  $('#product-modal').setAttribute('aria-hidden','false');
  $('#add-to-cart').dataset.id = p.id;
  $('#buy-now').dataset.id = p.id;
}
function closeModal(){ $('#product-modal').setAttribute('aria-hidden','true') }

// fetch products
fetch(PRODUCTS_URL)
  .then(r=>r.json())
  .then(data=>{
    state.products = data;
    renderProducts();
    updateCartUI();
  })
  .catch(err=>{
    console.error('Failed to load products', err);
    $('#products').innerHTML = '<p>Failed to load products.</p>';
  });

// event bindings
document.addEventListener('click', e=>{
  if(e.target.matches('#modal-close')) closeModal();
  if(e.target.matches('#product-modal')) closeModal();
});

$('#add-to-cart').addEventListener('click', ()=>{
  const id = $('#add-to-cart').dataset.id;
  const size = $('#modal-size').value;
  const p = state.products.find(x=>x.id==id);
  addToCart(p, size);
  closeModal();
});

$('#buy-now').addEventListener('click', ()=>{
  const id = $('#buy-now').dataset.id;
  const size = $('#modal-size').value;
  const p = state.products.find(x=>x.id==id);
  addToCart(p, size);
  // simple placeholder behavior: go to cart
  $('#cart-drawer').setAttribute('aria-hidden','false');
});

$('#cart-button').addEventListener('click', ()=>{
  $('#cart-drawer').setAttribute('aria-hidden','false');
  updateCartUI();
});
$('#close-cart').addEventListener('click', ()=>{
  $('#cart-drawer').setAttribute('aria-hidden','true');
});

$('#checkout-btn').addEventListener('click', ()=>{
  // placeholder - implement payment/order backend
  alert('Checkout placeholder — integrate a payment gateway or send order details to your backend.');
});

// search, category, sort
$('#search').addEventListener('input', (e)=>{
  state.search = e.target.value;
  renderProducts();
});

$all('.category-filter').forEach(b=>b.addEventListener('click', e=>{
  state.filter = e.target.dataset.cat;
  renderProducts();
}));

$('#sort').addEventListener('change', (e)=>{
  state.sort = e.target.value;
  renderProducts();
});

// contact form
$('#contact-form').addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const fd = new FormData(ev.target);
  alert('Thanks, ' + fd.get('name') + '! Your message has been received.');
  ev.target.reset();
});

// carousel basic auto-rotate
(function initCarousel(){
  const slides = $all('.hero-carousel .slide');
  let idx = 0;
  setInterval(()=>{
    slides[idx].classList.remove('active');
    idx = (idx + 1) % slides.length;
    slides[idx].classList.add('active');
  }, 5000);
})();

// set year
document.getElementById('year').textContent = new Date().getFullYear();