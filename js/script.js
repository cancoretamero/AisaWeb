/*
 * Script principal para el sitio de Aisa Group. Este archivo contiene
 * la inicialización de bibliotecas, el control del modo oscuro,
 * interacciones de navegación y la lógica del mapa interactivo
 * construido con D3.js. Para añadir nuevas funciones o modificar
 * comportamientos existentes, edita este archivo y asegúrate de que
 * cualquier cambio relevante sea reflejado también en el HTML o CSS
 * si aplica.
 */

// Inicializa las animaciones de AOS cuando el documento está listo
document.addEventListener('DOMContentLoaded', () => {
    if (window.AOS && !document.documentElement.classList.contains('screenshot')) {
        AOS.init({ once: true, duration: 1000, offset: 50 });
    }
});

// ------------------------------------------------------------
// Contact modal logic
// ------------------------------------------------------------
// Este bloque gestiona la apertura y cierre del modal de contacto.
// El modal se abre desde los botones de contacto del menú y del pie de página,
// permite al usuario escribir su nombre, email y mensaje, y luego elegir
// entre enviar un correo electrónico o abrir WhatsApp con un texto
// precompletado. No utiliza servicios de pago ni APIs externas.
document.addEventListener('DOMContentLoaded', () => {
    const contactModal = document.getElementById('contact-modal');
    const openContactButtons = [
        document.getElementById('nav-contact-btn'),
        document.getElementById('footer-contact-btn')
    ];
    const closeContactBtn = document.getElementById('close-contact');
    const sendEmailBtn = document.getElementById('send-email');
    const sendWhatsAppBtn = document.getElementById('send-whatsapp');
    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    // The message area is now a contenteditable div. We'll reference it below.
    const contactMessage = document.getElementById('contact-message');
    // Toolbar buttons for rich text editing
    const toolbarButtons = document.querySelectorAll('#contact-toolbar button');
    // Reemplace este número con el número real de WhatsApp de contacto.
    const whatsappNumber = '+0000000000';

    function openContactModal(event) {
        if (event) event.preventDefault();
        if (!contactModal) return;
        contactModal.classList.remove('hidden');
        contactModal.classList.add('flex');
        document.body.classList.add('overflow-hidden');
    }

    function closeContactModal() {
        if (!contactModal) return;
        contactModal.classList.add('hidden');
        contactModal.classList.remove('flex');
        document.body.classList.remove('overflow-hidden');
    }

    // Asigna eventos a los botones de apertura
    openContactButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', openContactModal);
        }
    });

    // Asigna evento al botón de cierre
    if (closeContactBtn) {
        closeContactBtn.addEventListener('click', closeContactModal);
    }

    // Asigna eventos a los botones de la barra de herramientas
    if (toolbarButtons) {
        toolbarButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const command = btn.getAttribute('data-command');
                if (command) {
                    document.execCommand(command, false, null);
                    if (contactMessage) contactMessage.focus();
                }
            });
        });
    }

    // Cierra el modal si se hace clic en el overlay
    if (contactModal) {
        contactModal.addEventListener('click', (event) => {
            if (event.target.id === 'contact-modal-overlay') {
                closeContactModal();
            }
        });
    }

    // Cierra con la tecla ESC
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && contactModal && !contactModal.classList.contains('hidden')) {
            closeContactModal();
        }
    });

    // Construye un mailto y abre el cliente de correo
    if (sendEmailBtn) {
        sendEmailBtn.addEventListener('click', () => {
            const name = nameInput ? nameInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            // Obtén el texto sin formato del área de mensaje (contenteditable)
            const message = contactMessage ? contactMessage.innerText.trim() : '';
            const subject = encodeURIComponent('Contacto desde Aisa Group');
            const body = encodeURIComponent(`Nombre: ${name}\nEmail: ${email}\nMensaje:\n${message}`);
            const mailtoLink = `mailto:info@aisagroup.ca?subject=${subject}&body=${body}`;
            window.open(mailtoLink, '_blank');
            closeContactModal();
        });
    }

    // Construye un enlace a WhatsApp con el mensaje precompletado
    if (sendWhatsAppBtn) {
        sendWhatsAppBtn.addEventListener('click', () => {
            const name = nameInput ? nameInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const message = contactMessage ? contactMessage.innerText.trim() : '';
            const whatsappText = encodeURIComponent(`Nombre: ${name}\nEmail: ${email}\nMensaje:\n${message}`);
            const whatsappLink = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${whatsappText}`;
            window.open(whatsappLink, '_blank');
            closeContactModal();
        });
    }
});

// Modo oscuro y tema
const themeBtn = document.getElementById('theme-toggle');
const htmlElement = document.documentElement;

// Maneja el click en el botón para alternar el tema
if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        htmlElement.classList.toggle('dark');
        localStorage.setItem('theme', htmlElement.classList.contains('dark') ? 'dark' : 'light');
    });
}

// Efecto parallax en el fondo del héroe
const heroBg = document.getElementById('hero-bg');
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    const scroll = window.scrollY;
    if (scroll < window.innerHeight && heroBg) {
        heroBg.style.transform = `translate3d(0, ${scroll * 0.4}px, 0)`;
    }
});

// -------------------------
// Lógica del Mapa D3.js
// -------------------------
// Configura las dimensiones base para el SVG del mapa. El mapa se
// ajustará al contenedor vía viewBox, así que estas medidas son
// proporcionales y no absolutas.
const width = 960;
const height = 500;

// Definición de localizaciones geocodificadas con atributos
const locations = [
    { name: "Mendoza, AR", coords: [-68.8272, -32.8908], type: "corporate", desc: "AISA LP / ISBER LLC", detail: "Domicilio Legal", address: "Alem 2898, Dorrego, Guaymallén" },
    { name: "San Juan HQ, AR", coords: [-68.5364, -31.5375], type: "mining", desc: "Minas Argentinas / Aisa", detail: "Sede Administrativa", address: "Av. José Ignacio de la Roza (Ex Cinzano)" },
    { name: "Jáchal, AR", coords: [-68.7463, -30.2406], type: "mining", desc: "Mina Gualcamayo", detail: "Operación Minera", address: "Departamento Jáchal" },
    { name: "San Luis, AR", coords: [-66.3356, -33.2950], type: "mining", desc: "Parque Solar Calicanto", detail: "Energía Renovable", address: "Provincia de San Luis" },
    { name: "Buenos Aires, AR", coords: [-58.4069, -34.5828], type: "fishing", desc: "Cabo Vírgenes", detail: "Oficina Comercial", address: "Jerónimo Salguero 2745" },
    { name: "Puerto Rawson, AR", coords: [-65.1023, -43.3002], type: "fishing", desc: "Cabo Vírgenes", detail: "Base Operativa & Planta", address: "Av. M. González y S.J.C. Marsengo" },
    { name: "Comodoro Rivadavia, AR", coords: [-67.5, -45.8667], type: "fishing", desc: "Cabo Vírgenes", detail: "Soporte Regional", address: "Las Toninas 636" },
    { name: "Saint John, CA", coords: [-66.0628, 45.2733], type: "corporate", desc: "AISA LP", detail: "Registro Corporativo", address: "60 Charlotte St" },
    { name: "Sioux Falls, US", coords: [-96.7283, 43.5460], type: "corporate", desc: "AISA LP / ISBER LLC", detail: "Domicilio Societario", address: "140 N Phillips Ave STE 301" },
    { name: "Madrid (Palencia), ES", coords: [-4.5240, 42.0095], type: "fishing", desc: "Cabo Vírgenes", detail: "Planta Industrial", address: "Calle Torneros 18, Palencia" },
    { name: "Vigo, ES", coords: [-8.7207, 42.2406], type: "fishing", desc: "Cabo Vírgenes", detail: "Oficina Comercial", address: "Cánovas del Castillo 17" },
    { name: "Shanghai, CN", coords: [121.4737, 31.2304], type: "corporate", desc: "Oficina Comercial", detail: "Compras y Logística", address: "Shanghai Commercial Hub" },
    { name: "Londres, UK", coords: [-0.1278, 51.5074], type: "corporate", desc: "Oficina Representación", detail: "Hub Financiero", address: "City of London" }
];

// Mapa de colores según el tipo de sitio
const colorMap = {
    corporate: '#FACC15',
    mining: '#10B981',
    fishing: '#22D3EE'
};

// Inicialización del SVG del mapa
const svg = d3.select('#map-viewport')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid slice')
    .style('width', '100%')
    .style('height', '100%');

const g = svg.append('g');

// Gradiente para líneas de conexión (neón)
const defs = svg.append('defs');
const gradient = defs.append('linearGradient')
    .attr('id', 'neonGradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '0%');

gradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(250, 204, 21, 0.1)');
gradient.append('stop').attr('offset', '50%').attr('stop-color', 'rgba(250, 204, 21, 1)');
gradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(250, 204, 21, 0.1)');

// Proyección geoMercator
const projection = d3.geoMercator()
    .scale(150)
    .translate([width / 2, height / 1.5]);

const pathGenerator = d3.geoPath().projection(projection);

// Configuración de zoom con límites
const zoomBehaviour = d3.zoom()
    .scaleExtent([1, 10])
    .on('zoom', (event) => {
        const transform = event.transform;
        g.attr('transform', transform);

        // Ajusta tamaño de las etiquetas de pines cuando se hace zoom
        g.selectAll('.pin-group').attr('transform', d => {
            const [x, y] = projection(d.coords);
            return `translate(${x},${y}) scale(${1 / transform.k})`;
        });

        // Ajusta grosor de las líneas
        g.selectAll('.mesh-line').style('stroke-width', 1.5 / transform.k);

        // Elimina tooltips existentes durante el zoom
        d3.selectAll('.map-tooltip-container').remove();
    });

svg.call(zoomBehaviour);

// Carga los datos geográficos del mundo y dibuja el mapa
d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson').then(function(data) {
    // Dibuja contornos del mundo
    g.selectAll('path')
        .data(data.features)
        .enter()
        .append('path')
        .attr('d', pathGenerator)
        .attr('fill', '#1a1a1a')
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5)
        .style('transition', 'fill 0.3s ease')
        .on('mouseover', function() {
            d3.select(this).attr('fill', '#2a2a2a');
        })
        .on('mouseout', function() {
            d3.select(this).attr('fill', '#1a1a1a');
        });

    // Define conexiones entre hubs para la animación de líneas
    const hubs = [
        { source: 'Mendoza, AR', target: 'Shanghai, CN' },
        { source: 'Mendoza, AR', target: 'Madrid (Palencia), ES' },
        { source: 'Mendoza, AR', target: 'Sioux Falls, US' },
        { source: 'Sioux Falls, US', target: 'Saint John, CA' },
        { source: 'Mendoza, AR', target: 'San Juan HQ, AR' },
        { source: 'Mendoza, AR', target: 'Buenos Aires, AR' },
        { source: 'Madrid (Palencia), ES', target: 'Londres, UK' }
    ];

    // Helper para obtener coordenadas de un sitio por nombre
    function getCoords(name) {
        const loc = locations.find(l => l.name === name);
        return loc ? loc.coords : [0, 0];
    }

    // Dibuja líneas de conexión con curvas
    g.selectAll('.mesh-line')
        .data(hubs)
        .enter()
        .append('path')
        .attr('class', 'mesh-line')
        .attr('d', d => {
            const source = projection(getCoords(d.source));
            const target = projection(getCoords(d.target));
            const dx = target[0] - source[0];
            const dy = target[1] - source[1];
            const dr = Math.sqrt(dx * dx + dy * dy);
            return `M${source[0]},${source[1]}A${dr},${dr} 0 0,1 ${target[0]},${target[1]}`;
        })
        .style('fill', 'none')
        .style('stroke', 'url(#neonGradient)')
        .style('stroke-width', 1.5)
        .style('opacity', 0.8)
        .style('stroke-dasharray', '4,4')
        .style('filter', 'drop-shadow(0 0 3px #FACC15)')
        .style('pointer-events', 'none');

    // Agrupa los pines
    const pinGroups = g.selectAll('.pin-group')
        .data(locations)
        .enter()
        .append('g')
        .attr('class', 'pin-group')
        .attr('transform', d => `translate(${projection(d.coords)})`);

    // Añade círculos de pulsación
    pinGroups.append('circle')
        .attr('r', 8)
        .attr('fill', d => colorMap[d.type])
        .attr('opacity', 0.4)
        .append('animate')
        .attr('attributeName', 'r')
        .attr('from', 4)
        .attr('to', 12)
        .attr('dur', '1.5s')
        .attr('repeatCount', 'indefinite');

    pinGroups.append('circle')
        .attr('r', 8)
        .attr('fill', d => colorMap[d.type])
        .attr('opacity', 0)
        .append('animate')
        .attr('attributeName', 'opacity')
        .attr('values', '0.8;0;0.8')
        .attr('dur', '1.5s')
        .attr('repeatCount', 'indefinite');

    // Círculo central (pin visible)
    pinGroups.append('circle')
        .attr('r', 4)
        .attr('fill', d => colorMap[d.type])
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('filter', 'drop-shadow(0 0 5px white)')
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            // Elimina cualquier tooltip existente
            d3.select('.map-tooltip-container').remove();

            // Crea tooltip y ubícalo en el body para evitar overflow
            const tooltip = d3.select('body').append('div')
                .attr('class', 'map-tooltip-container map-tooltip-visible')
                .style('left', `${event.pageX}px`)
                .style('top', `${event.pageY - 20}px`);

            tooltip.html(`
                <div class="flex items-center gap-3 mb-3 border-b border-white/10 pb-3">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center text-black font-bold text-lg" style="background-color: ${colorMap[d.type]}">
                        <i class="fa-solid fa-location-dot"></i>
                    </div>
                    <div>
                        <h5 class="text-white font-bold text-sm leading-tight">${d.name}</h5>
                        <span class="text-[10px] uppercase tracking-wider" style="color: ${colorMap[d.type]}">${d.type}</span>
                    </div>
                </div>
                <div class="space-y-2 text-xs text-gray-300">
                    <p class="font-bold text-white">${d.desc}</p>
                    <p>${d.detail}</p>
                    <p class="text-gray-400 text-[10px] mt-2 border-t border-white/5 pt-2"><i class="fa-solid fa-map-pin mr-1"></i> ${d.address}</p>
                </div>
                <div class="flex gap-3 mt-4 pt-2 border-t border-white/10">
                    <a href="#" class="text-white hover:text-[${colorMap[d.type]}]"><i class="fa-solid fa-phone"></i></a>
                    <a href="#" class="text-white hover:text-[${colorMap[d.type]}]"><i class="fa-solid fa-envelope"></i></a>
                    <a href="#" class="text-white hover:text-[${colorMap[d.type]}]"><i class="fa-solid fa-globe"></i></a>
                </div>
            `);

            // Reposicionamiento inteligente dentro del viewport
            const tooltipNode = tooltip.node();
            const tooltipRect = tooltipNode.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let left = event.pageX;
            let top = event.pageY - 20;
            let transformX = -50;
            let transformY = -100;

            // Bordes laterales
            if (event.clientX + (tooltipRect.width / 2) > viewportWidth) {
                transformX = -100;
                left = event.pageX - 10;
            } else if (event.clientX - (tooltipRect.width / 2) < 0) {
                transformX = 0;
                left = event.pageX + 10;
            }

            // Bordes superior e inferior
            if (event.clientY - tooltipRect.height < 20) {
                transformY = 0;
                top = event.pageY + 20;
            }
            if (event.clientY + tooltipRect.height > viewportHeight) {
                transformY = -100;
                top = event.pageY - 20;
            }

            tooltip.style('transform', `translate(${transformX}%, ${transformY}%)`);
        })
        .on('mouseout', function() {
            // Los tooltips se cierran al hacer clic fuera (ver body click)
        });

    // Click en el body cierra tooltips si no se hace click en un pin o tooltip
    d3.select('body').on('click', function(event) {
        if (event.target.tagName !== 'circle' && !event.target.closest('.map-tooltip-container')) {
            d3.select('.map-tooltip-container').remove();
        }
    });
});

// Manejo de zoom manual mediante botones
function zoomIn() {
    svg.transition().duration(500).call(zoomBehaviour.scaleBy, 1.5);
}

function zoomOut() {
    svg.transition().duration(500).call(zoomBehaviour.scaleBy, 0.75);
}

// Función para enfocar zonas según región
function zoomTo(region) {
    // Elimina estado activo en todos los botones
    document.querySelectorAll('#global button').forEach(b => b.classList.remove('text-accent-gold', 'border-accent-gold'));

    // Variables de traslación y escala
    let x, y, k;

    if (region === 'global') {
        x = width / 2;
        y = height / 1.5;
        k = 1;
    } else if (region === 'Argentina') {
        const coords = projection([-65, -38]);
        x = coords[0]; y = coords[1]; k = 5;
    } else if (region === 'Spain') {
        const coords = projection([-4, 40]);
        x = coords[0]; y = coords[1]; k = 6;
    } else if (region === 'United States') {
        const coords = projection([-98, 38]);
        x = coords[0]; y = coords[1]; k = 3;
    } else if (region === 'China') {
        const coords = projection([105, 35]);
        x = coords[0]; y = coords[1]; k = 3;
    } else if (region === 'Canada') {
        const coords = projection([-100, 55]);
        x = coords[0]; y = coords[1]; k = 2.5;
    } else if (region === 'United Kingdom') {
        const coords = projection([-0.12, 51.5]);
        x = coords[0]; y = coords[1]; k = 6;
    }

    svg.transition().duration(1500).call(
        zoomBehaviour.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(k).translate(-x, -y)
    );
}

// Export functions globally so they can be called from HTML buttons
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.zoomTo = zoomTo;

// ------------------------------------------------------------
// Video modal logic
// ------------------------------------------------------------
// Este bloque gestiona la apertura y cierre del modal de video corporativo.
// Utiliza la biblioteca Plyr (MIT) para crear un reproductor moderno
// con controles personalizados como play/pause, volumen, subtítulos y velocidad.
document.addEventListener('DOMContentLoaded', () => {
    const openVideoBtn = document.getElementById('open-video');
    const videoModal = document.getElementById('video-modal');
    const closeVideoBtn = document.getElementById('close-video');
    const videoElement = document.getElementById('corporate-video');
    let player;

    // Función para abrir el modal y reproducir el video
    function openVideoModal(event) {
        event.preventDefault();
        if (!videoModal) return;
        videoModal.classList.remove('hidden');
        videoModal.classList.add('flex');

        // Inicializa el reproductor Plyr solo una vez
        if (!player && window.Plyr) {
            player = new Plyr(videoElement, {
                controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'fullscreen'],
                settings: ['speed', 'captions', 'quality'],
                speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
                i18n: {
                    restart: 'Reiniciar',
                    rewind: 'Rebobinar',
                    play: 'Reproducir',
                    pause: 'Pausar',
                    fastForward: 'Avanzar',
                    seek: 'Buscar',
                    currentTime: 'Tiempo actual',
                    duration: 'Duración',
                    volume: 'Volumen',
                    toggleMute: 'Silenciar',
                    toggleCaptions: 'Subtítulos',
                    settings: 'Configuración',
                    speed: 'Velocidad',
                    normal: 'Normal',
                    fullscreen: 'Pantalla completa'
                }
            });
        }

        // Reproduce el video si el reproductor existe
        if (player) {
            player.play();
        } else if (videoElement) {
            videoElement.play();
        }

        // Evita el scroll en el fondo
        document.body.classList.add('overflow-hidden');
    }

    // Función para cerrar el modal y pausar el video
    function closeVideoModal() {
        if (!videoModal) return;
        videoModal.classList.add('hidden');
        videoModal.classList.remove('flex');

        if (player) {
            player.pause();
        } else if (videoElement) {
            videoElement.pause();
        }

        document.body.classList.remove('overflow-hidden');
    }

    if (openVideoBtn) {
        openVideoBtn.addEventListener('click', openVideoModal);
    }
    if (closeVideoBtn) {
        closeVideoBtn.addEventListener('click', closeVideoModal);
    }

    // Cierra el modal al hacer clic en el fondo oscuro
    if (videoModal) {
        videoModal.addEventListener('click', (event) => {
            // Solo cerrar si se hace clic en el overlay y no en el contenido
            if (event.target.id === 'video-modal-overlay') {
                closeVideoModal();
            }
        });
    }

    // Cierra con tecla ESC
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && videoModal && !videoModal.classList.contains('hidden')) {
            closeVideoModal();
        }
    });
});


// ------------------------------------------------------------
// Content Engine (FREE) — data/content.json
// ------------------------------------------------------------
// Objetivo: habilitar contenido editable sin CMS de pago.
// Este bloque lee /data/content.json y aplica cambios al Hero
// de la página actual (index/sostenibilidad por ahora).
//
// Si no existe content.json o no hay datos para la página, no hace nada.
document.addEventListener('DOMContentLoaded', () => {
    function getPageSlug() {
        const p = window.location.pathname || '/';

        // Netlify / root
        if (p === '/' || p === '') return 'index';
        if (p.endsWith('/')) return 'index';

        const last = p.split('/').filter(Boolean).pop();
        if (!last) return 'index';

        if (last.toLowerCase() === 'index.html') return 'index';
        if (last.toLowerCase().endsWith('.html')) return last.slice(0, -5);

        return last;
    }

    function applyHero(heroData) {
        if (!heroData) return;

        // Root: prefer #hero (index), else first <header> (sostenibilidad, equipo, prensa, etc.)
        const heroRoot = document.getElementById('hero') || document.querySelector('header');
        if (!heroRoot) return;

        // Background image:
        // - index: #hero-bg img
        // - others: first <header> img
        const bgImg = document.querySelector('#hero-bg img') || heroRoot.querySelector('img');
        if (bgImg && heroData.bgImage) {
            bgImg.src = heroData.bgImage;
        }

        // Title
        const h1 = heroRoot.querySelector('h1');
        if (h1 && heroData.titleHtml) {
            h1.innerHTML = heroData.titleHtml;
        }

        // Description (first paragraph inside hero/header)
        const p = heroRoot.querySelector('p');
        if (p && heroData.descHtml) {
            p.innerHTML = heroData.descHtml;
        }

        // Tagline pill (only if page has the pill; index does)
        // If tagline is null/empty -> hide pill
        if (heroData.tagline !== undefined) {
            const pill = heroRoot.querySelector('.inline-flex');
            if (pill) {
                if (heroData.tagline && String(heroData.tagline).trim().length > 0) {
                    pill.style.display = '';
                    const spans = pill.querySelectorAll('span');
                    if (spans && spans.length) {
                        spans[spans.length - 1].textContent = heroData.tagline;
                    }
                } else {
                    pill.style.display = 'none';
                }
            }
        }
    }

    async function run() {
        const slug = getPageSlug();

        try {
            const res = await fetch('/data/content.json', { cache: 'no-store' });
            if (!res.ok) return;

            const json = await res.json();
            const heroData = json && json.pages && json.pages[slug] && json.pages[slug].hero;

            if (heroData) {
                applyHero(heroData);
            }
        } catch (e) {
            // Silencioso: no rompemos la web si el JSON no está disponible
            // (ideal para desarrollo o si hay un deploy parcial)
            // console.warn('[AISA Content Engine] No se pudo cargar content.json', e);
        }
    }

    run();
});
