/* Commercial rules retained from the published SAVG price list. */
(function(root){
  const rates={Basic:[null,null,null,170,160,150],Premium:[null,null,235,190,180,170],Elite:[315,290,265,215,200,185]};
  const minima={Basic:100,Premium:100,Elite:100};
  const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:0,maximumFractionDigits:2}).format(n);
  function unit(fabric,q){if(!Number.isInteger(q)||q<100||q>600||!rates[fabric])return null;return rates[fabric][q<20?0:q<50?1:q<100?2:q<150?3:q<250?4:5]}
  function today(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>parts.find(p=>p.type===t).value;return `${get('year')}-${get('month')}-${get('day')}`}
  function timing(date,base=today()){
    const invalid={valid:false,express:false,days:0,kind:'pending',title:'Elige cuándo necesitas recibirlas',text:'La fecha y la ciudad nos ayudan a revisar producción y envío.'};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return invalid;
    const start=new Date(base+'T12:00:00Z'),end=new Date(date+'T12:00:00Z');
    if(!Number.isFinite(+end)||end.toISOString().slice(0,10)!==date||end<=start)return {...invalid,title:'Elige una fecha posterior a hoy',text:'Necesitamos una fecha futura para calcular el presupuesto.'};
    let days=0;for(let d=new Date(start);d<end;){d.setUTCDate(d.getUTCDate()+1);if(d.getUTCDay()!==0&&d.getUTCDay()!==6)days++}
    const remaining=days===1?'Queda 1 día hábil':`Quedan ${days} días hábiles`;
    if(days<5)return {valid:false,days,express:false,kind:'rejected',title:'Proyecto rechazado por plazo',text:`${remaining} para la recepción. Necesitamos al menos 5 días hábiles para producir tu pedido. Elige una fecha posterior para continuar.`};
    const calendar=Math.round((end-start)/86400000),express=days<10;
    return {valid:true,days,express,kind:express?'express':calendar<28?'review':'standard',title:express?'Tu fecha requiere revisión exprés':calendar<28?'Revisaremos disponibilidad para tu fecha':'Tu fecha permite revisar producción estándar',text:express?`${remaining} para la recepción. Con menos de 10 días hábiles necesitamos priorizar la producción. Se aplica un 20% provisional sobre las prendas; el recargo no garantiza la entrega.`:calendar<28?`${days} días hábiles hasta la recepción solicitada. Sin recargo automático; el plazo es menor a 4 semanas y requiere revisar agenda y envío.`:'Producción de 3 a 4 semanas desde la aprobación completa y el anticipo, más envío. Confirmaremos la fecha contigo.'};
  }
  function defaultFabric(q){return ['Basic','Premium','Elite'].find(f=>unit(f,q)!==null)||null}
  function sizeError(v){const vals=Object.values(v.sizes||{});if(vals.some(n=>!Number.isInteger(n)||n<0))return 'Las tallas deben tener cantidades enteras de cero en adelante.';const n=vals.reduce((a,b)=>a+b,0);return n!==0&&n!==v.q?`Distribuiste ${n} de ${v.q} playeras. Completa las tallas o déjalas pendientes para continuar.`:''}
  function totals(variants,date,base){const t=timing(date,base);let subtotal=0;const items=variants.map(v=>{const price=unit(v.fabric,v.q);const amount=price===null?0:price*v.q;subtotal+=amount;return {unit:price,finalUnit:price===null?null:price*(t.valid&&t.express?1.2:1),subtotal:amount,total:amount*(t.valid&&t.express?1.2:1)}});const surcharge=t.valid&&t.express?subtotal*.2:0;return {t,items,subtotal,surcharge,total:subtotal+surcharge,valid:variants.length>0&&items.every(v=>v.unit!==null)}}
  function message(s,base){const x=totals(s.variants,s.date,base);return `Hola, quiero continuar mi pedido con SAVG by Chanek.\n${s.event?'Tipo de evento: '+s.event+(s.eventDetail?' · '+s.eventDetail:'')+'\n':''}${s.name?'Nombre / organización: '+s.name+'\n':''}Necesito recibirlo el: ${s.date||'por definir'}\n${s.eventDate?'Día del evento: '+s.eventDate+'\n':''}Ciudad de entrega: ${s.city||'por definir'}\n\n`+s.variants.map((v,i)=>{const p=x.items[i];const sizes=Object.entries(v.sizes||{}).filter(([,n])=>n>0).map(([k,n])=>`${k}: ${n}`).join(', ');return `${i+1}. ${v.q} playeras · Calidad ${qualityNames[v.fabric]||v.fabric}\nDiseño: ${v.sku?v.sku.toUpperCase():'por definir con asesor'}\nColor base: ${v.base||'por definir'} · Secundario: ${v.secondary||'por definir'}${v.special?'\nColor especial / comentarios: '+v.special:''}\nTallas: ${sizes||'pendientes'}\nPrecio base por playera: ${money(p.unit)} MXN\nExprés por playera: ${money(p.finalUnit-p.unit)} MXN\n${v.q} × ${money(p.finalUnit)} MXN = ${money(p.total)} MXN`}).join('\n\n')+`\n\nSubtotal prendas: ${money(x.subtotal)} MXN\nExprés provisional (20%): ${money(x.surcharge)} MXN\nTotal estimado de prendas: ${money(x.total)} MXN, IVA incluido.\nEnvío: por cotizar.\nDiseño: $500 MXN, descontado al producir (sin cargo neto adicional de diseño en este estimado).\n${x.t.text}\nLogos adicionales a SAVG by Chanek: ${s.logos===null||s.logos===undefined?'por definir':s.logos}.\nDiseño preestablecido: ${s.design==='chosen'?'ya elegido':s.design==='custom'?'solicita diseño externo / desde cero':'pendiente de elegir'}.\nAcepta marca SAVG visible: ${s.brand==='yes'?'sí':s.brand==='no'?'no':'por confirmar'}.\nPersonalización individual: ${s.individual==='yes'?'sí':s.individual==='no'?'no':'por confirmar'}.\nLogos: pendientes de enviar y revisar.\n${s.notes?'Comentarios: '+s.notes+'\n':''}Cada diseño y combinación se cotiza por separado; no se acumulan cantidades entre variantes. Precio sujeto a confirmación por diseño y color.\nCondiciones de producción: 50% de anticipo y saldo antes del envío; 3 a 4 semanas desde aprobación completa. La cotización no reserva fecha ni inicia producción. Solicito confirmar disponibilidad, envío y precio final.`}
  const qualityNames={Basic:'Media',Premium:'Alta',Elite:'Premium'};
  const tournaments=['Torneo de tenis','Torneo de pádel'];
  function assessment(s,base){
    const red=[],yellow=[],green=[],vs=s.variants||[],t=timing(s.date,base);
    if(!s.event)yellow.push('Falta elegir el deporte del torneo.');
    else if(!tournaments.includes(s.event))red.push('Este cotizador es exclusivo para torneos de tenis o pádel.');
    else green.push('El torneo corresponde a nuestro servicio.');
    if(!vs.length||vs.some(v=>!Number.isInteger(v.q)||v.q<100||v.q>600))red.push('Cada variante debe llevar de 100 a 600 playeras para usar este cotizador. Ajusta las cantidades o consulta el proyecto con un asesor.');
    else if(vs.some(v=>unit(v.fabric,v.q)===null))red.push('La calidad elegida no está disponible para la cantidad de alguna variante. Cambia la calidad o ajusta las piezas.');
    else green.push('La cantidad y la calidad elegidas son compatibles.');
    if(s.design==='custom')red.push('SAVG trabaja solo con diseños preestablecidos, adaptados con tus colores y logos. Para continuar, elige uno del catálogo.');
    else if(s.design!=='chosen')yellow.push('Falta elegir un diseño preestablecido del catálogo.');
    else green.push('Tu proyecto usa un diseño preestablecido.');
    if(s.design==='chosen'&&vs.some(v=>v.sku&&!/^[a-f][1-3]$/i.test(String(v.sku).trim())))red.push('Algún código de diseño no corresponde al catálogo. Elige uno de los diseños preestablecidos A1 a F3.');
    if(s.brand==='no')red.push('La marca SAVG by Chanek debe permanecer visible al frente de las playeras.');
    else if(s.brand!=='yes')yellow.push('Falta confirmar que la marca SAVG by Chanek permanecerá visible.');
    if(s.individual==='yes')red.push('SAVG no ofrece nombres ni números diferentes por persona. Para continuar, ajusta esa personalización.');
    else if(s.individual!=='no')yellow.push('Falta confirmar si necesitas personalización individual.');
    if(t.kind==='rejected')red.push(t.text);
    else if(!t.valid)yellow.push(s.date?'Necesitamos una fecha de recepción futura y válida.':'Falta la fecha de recepción para calcular el plazo y el posible exprés.');
    else if(t.express)yellow.push('Tu fecha requiere exprés: incluimos +20% provisional y necesitamos confirmar capacidad y transporte.');
    else if(t.kind==='review')yellow.push('Tu plazo es menor a 4 semanas: necesitamos revisar producción y envío.');
    else green.push('La fecha permite revisar producción estándar de 3 a 4 semanas, más envío.');
    if(!String(s.city||'').trim())yellow.push('Falta la ciudad y el estado para revisar el envío.');
    if(s.logos===null||s.logos===undefined)yellow.push('Falta definir cuántos logos llevará, además de SAVG by Chanek.');
    else if(!Number.isInteger(s.logos)||s.logos<0)red.push('Revisa la cantidad de logos: usa un número entero de cero en adelante.');
    else if(s.logos===0)yellow.push('SAVG es una línea institucional: necesitamos revisar la identidad de tu evento o empresa.');
    else if(s.logos>15)yellow.push('Solicitas más de 15 logos adicionales: necesitamos revisar el alcance y confirmar el precio final.');
    const level=red.length?'red':yellow.length?'yellow':'green';
    return {level,title:level==='red'?'Necesitamos ajustar tu proyecto':level==='yellow'?'Revisemos algunos detalles':'Tu proyecto encaja',reasons:[...red,...yellow],positives:green};
  }
  const api={tournaments,assessment,qualityNames,rates,minima,money,unit,today,timing,defaultFabric,sizeError,totals,message};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SavgQuote=api;
})(typeof window!=='undefined'?window:globalThis);
