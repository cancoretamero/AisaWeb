// Initialize AOS for animations on scroll
if (window.AOS && !document.documentElement.classList.contains('screenshot')) {
    AOS.init({ once: true, duration: 800 });
}

// Utility to animate SVG progress rings
function setProgress(percent, element) {
    const circle = element;
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - percent / 100 * circumference;
    circle.style.strokeDashoffset = offset;
}

// IntersectionObserver to trigger progress rings and counters when visible
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const rings = entry.target.querySelectorAll('.progress-ring__circle');
            rings.forEach(ring => {
                const percent = ring.getAttribute('data-percent');
                setProgress(percent, ring);
            });
            const counters = entry.target.querySelectorAll('.counter');
            counters.forEach(counter => {
                const target = +counter.getAttribute('data-target');
                const duration = 2000;
                const increment = target / (duration / 16);
                let current = 0;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        counter.innerText = target;
                        clearInterval(timer);
                    } else {
                        counter.innerText = Math.ceil(current);
                    }
                }, 16);
            });
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

// Observe all elements with glass-apple class for progress/counter animation
document.querySelectorAll('.glass-apple').forEach(el => observer.observe(el));

// Show selected project in the ecosystem map and update button styles
function showProject(id, btn) {
    document.querySelectorAll('.project-content').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('grid');
    });
    const selected = document.getElementById(id);
    if (selected) {
        selected.classList.remove('hidden');
        selected.classList.add('grid');
    }
    const buttons = btn.parentElement.querySelectorAll('button');
    buttons.forEach(b => {
        b.classList.remove('bg-white', 'text-black', 'shadow-lg');
        b.classList.add('text-gray-400');
    });
    btn.classList.add('bg-white', 'text-black', 'shadow-lg');
    btn.classList.remove('text-gray-400');
}

// Update scenario selection and display associated information
function setScenario(scenario, btn) {
    const buttons = btn.parentElement.querySelectorAll('button');
    buttons.forEach(b => {
        b.classList.remove('bg-accent-gold', 'text-black', 'border-accent-gold/30', 'bg-accent-gold/10');
        b.classList.add('bg-white/5', 'text-gray-400', 'border-white/10');
    });
    btn.classList.remove('bg-white/5', 'text-gray-400', 'border-white/10');
    btn.classList.add('bg-accent-gold/10', 'text-accent-gold', 'border-accent-gold/30');
    const title = document.getElementById('projectTitle');
    const location = document.getElementById('projectLocation');
    const desc = document.getElementById('projectDesc');
    const slider = document.getElementById('mwRange');
    if (scenario === 'calicanto') {
        title.innerHTML = '<i class="fa-solid fa-location-dot text-accent-gold"></i> Parque Solar Calicanto';
        location.innerText = 'Nogolí, San Luis • En Construcción';
        desc.innerHTML = 'Con una inversión inicial de <strong>USD 35 Millones</strong>, este parque de 51 MW es el primer paso en la estrategia de diversificación energética. Emplazado en 71.9 hectáreas, inyectará energía limpia al SADI y abastecerá operaciones mineras.';
        slider.value = 51;
    } else if (scenario === 'gualcamayo_solar') {
        title.innerHTML = '<i class="fa-solid fa-bolt text-accent-gold"></i> Gualcamayo Solar (RIGI)';
        location.innerText = 'Jáchal, San Juan • En Proyecto';
        desc.innerHTML = 'Como parte de la adhesión al <strong>Régimen RIGI</strong>, Aisa Group proyecta un parque fotovoltaico masivo de hasta <strong>1000 MW</strong> (inversión est. USD 600M) para abastecer la demanda industrial y minera de la región.';
        slider.value = 800;
    }
    calculateImpact(slider.value);
}

// Calculate impact metrics based on installed MW
function calculateImpact(mw) {
    document.getElementById('mwDisplay').innerText = mw;
    const ratioGWh = 110.1 / 51;
    const gwh = (mw * ratioGWh).toFixed(1);
    const ratioHomes = 80000 / 51;
    const homes = Math.ceil(mw * ratioHomes);
    const ratioCO2 = 50000 / 51;
    const co2 = Math.ceil(mw * ratioCO2);
    const ratioTrees = 2500000 / 51;
    const trees = mw * ratioTrees;
    let treesDisplay = trees > 1000000 ? (trees / 1000000).toFixed(1) + 'M' : Math.ceil(trees).toLocaleString();
    document.getElementById('gwhValue').innerText = gwh;
    document.getElementById('homesValue').innerText = homes.toLocaleString();
    document.getElementById('co2Value').innerText = co2.toLocaleString();
    document.getElementById('treesValue').innerText = treesDisplay;
}

// Initialize default impact values
calculateImpact(51);

// Definitions for the sustainability detail modals
const modalContent = {
    gualcamayo: `<span class="text-emerald-400 font-bold tracking-widest text-xs uppercase mb-4 block">Minería</span>
                    <h2 class="font-display text-4x md:text-5x font-bold text-white mb-6">Proyecto Carbonatos Profundos</h2>
                    <div class="w-20 h-1 bg-emerald-500 mb-8"></div>
                    <p class="lead text-xl text-gray-300 mb-8 leading-relaxed">Una segunda vida para Gualcamayo basada en la eficiencia y la tecnología. Transformando un pasivo ambiental potencial en un activo productivo sostenible.</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        <div class="bg-white/5 p-6 rounded-2x border border-white/10">
                            <h4 class="text-white font-bold mb-2 flex items-center gap-2"><i class="fa-solid fa-triangle-exclamation text-red-400"></i> Desafío</h4>
                            <p class="text-gray-400 text-sm">El agotamiento de los óxidos superficiales amenazaba con el cierre de la mina, lo que hubiera impactado negativamente a 2000 familias de la región de Jáchal.</p>
                        </div>
                        <div class="bg-white/5 p-6 rounded-2x border border-white/10">
                            <h4 class="text-white font-bold mb-2 flex items-center gap-2"><i class="fa-solid fa-check-circle text-emerald-400"></i> Solución Aisa</h4>
                            <p class="text-gray-400 text-sm">Inversión de 1.000M USD para explotar el cuerpo subterráneo con tecnología de flotación avanzada que permite recuperar oro de minerales refractarios de manera eficiente.</p>
                        </div>
                    </div>
                    <img src="https://images.unsplash.com/photo-1578923307077-947761596a2e?q=80&w=2070&auto=format&fit=crop" class="w-full rounded-3x mb-12 opacity-80 shadow-2x">
                    <h3 class="text-3x font-bold text-white mb-6">Gestión Hídrica de Vanguardia</h3>
                    <p class="text-gray-400 mb-6 leading-relaxed">La nueva planta de procesos incorpora un sistema de <strong>filtros de prensa</strong> para los relaves. Esta tecnología permite separar el agua de los sólidos antes de su disposición final, logrando recuperar hasta el <strong>85% del agua</strong> para recircularla al proceso industrial.</p>`,
    calicanto: `<span class="text-accent-gold font-bold tracking-widest text-xs uppercase mb-4 block">Energía</span>
                    <h2 class="font-display text-4x md:text-5x font-bold text-white mb-6">Parque Solar Calicanto</h2>
                    <div class="w-20 h-1 bg-accent-gold mb-8"></div>
                    <p class="lead text-xl text-gray-300 mb-8 leading-relaxed">Energía limpia para alimentar el desarrollo industrial. El primer paso hacia la descarbonización total de nuestras operaciones.</p>
                    <p class="text-gray-400 mb-6 text-lg">Ubicado en el departamento Belgrano, San Luis (a 8km de Nogolí), este parque de <strong>51 MW</strong> es la punta de lanza de Aisa Energy. No es solo un proyecto de generación; es una declaración de principios sobre cómo debe alimentarse la minería del futuro.</p>
                    <div class="bg-gradient-to-r from-accent-gold/10 to-transparent p-8 rounded-2x border-l-4 border-accent-gold mb-12">
                        <p class="text-white font-bold text-lg mb-2">Dato Clave de Impacto:</p>
                        <p class="text-gray-300">Con una inversión de USD 35 millones, generará 110.1 GWh anuales, evitando 50.000 toneladas de CO2 al año.</p>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div class="bg-white/5 p-4 rounded-xl">
                            <div class="text-2x font-bold text-white">51 MW</div>
                            <div class="text-xs text-gray-500 uppercase">Capacidad</div>
                        </div>
                        <div class="bg-white/5 p-4 rounded-xl">
                            <div class="text-2x font-bold text-white">71.9 Ha</div>
                            <div class="text-xs text-gray-500 uppercase">Superficie</div>
                        </div>
                        <div class="bg-white/5 p-4 rounded-xl">
                            <div class="text-2x font-bold text-white">110 GWh</div>
                            <div class="text-xs text-gray-500 uppercase">Generación Anual</div>
                        </div>
                    </div>`,
    chelsea: `<span class="text-purple-400 font-bold tracking-widest text-xs uppercase mb-4 block">Real Estate &amp; Cultura</span>
                    <h2 class="font-display text-4x md:text-5x font-bold text-white mb-6">Recuperación Ex-Cinzano</h2>
                    <div class="w-20 h-1 bg-purple-500 mb-8"></div>
                    <p class="lead text-xl text-gray-300 mb-8 leading-relaxed">Donde la historia se encuentra con la innovación. Un proyecto de regeneración urbana sin precedentes en San Juan.</p>
                    <p class="text-gray-400 mb-6 text-lg">Aisa Group, a través de su desarrolladora <strong>Chelsea Design Estates</strong>, asumió el desafío de restaurar la icónica planta industrial de Cinzano.</p>
                    <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop" class="w-full rounded-3x mb-12 opacity-80 shadow-2x">`
};

// Open sustainability modal with content based on identifier
function openModal(id) {
    const content = modalContent[id];
    if (content) {
        document.getElementById('modal-body').innerHTML = content;
        const modal = document.getElementById('modal');
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('active'), 10);
        document.body.style.overflow = 'hidden';
    }
}

// Close sustainability modal
function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }, 300);
}

// Allow closing modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        closeModal();
    }
});
