(function(root){
  function dateAfter(base,n,business=false){const d=new Date(base+'T12:00:00Z');for(let done=0;done<n;){d.setUTCDate(d.getUTCDate()+1);if(!business||(d.getUTCDay()!==0&&d.getUTCDay()!==6))done++}return d.toISOString().slice(0,10)}
  function get(id,base){const v=(q,fabric,sku='A1')=>({q,fabric,sku,base:'',secondary:'',special:'',sizes:{}});const common={event:'Torneo de tenis',eventDetail:'',same:true,count:2,date:dateAfter(base,42),city:'Morelia, Michoacán',design:'chosen',code:'A1',colors:'',brand:'yes',individual:'no',logos:3,step:8,trail:[0,1,2,3,4,5,6,7]};
    const cases={estandar:{title:'Pedido estándar · cantidad escrita',variants:[v(137,'Basic')]},expres:{title:'Pedido exprés',date:dateAfter(base,5,true),variants:[v(120,'Premium')]},diseno:{title:'Proyecto que requiere ajustes',design:'custom',code:'',variants:[v(100,'Elite','')]},variantes:{title:'Dos variantes cotizadas por separado',same:false,variants:[v(100,'Elite','A1'),v(100,'Elite','B2')]}};
    return Object.hasOwn(cases,id)?{...common,...cases[id]}:null;
  }
  const api={get,dateAfter};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SavgExamples=api;
})(typeof window!=='undefined'?window:globalThis);
