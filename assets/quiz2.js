/* 第2弾以降の診断の共通エンジン。質問と結果のデータは各ページが渡す（tools/quiz-data.mjs）。
   Quiz.run({id, qs, keys, els:{start,quiz,num,prog,q,opts,back}, onDone(answers, rank)}) */
(function(){
  function ev(n,p){if(window.gtag)gtag("event",n,p||{})}
  function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
  function rank(keys,qs,ans){
    var sc={},heavy={},last={};
    keys.forEach(function(k){sc[k]=0;heavy[k]=0;last[k]=-1});
    ans.forEach(function(k,n){var w=qs[n].w||1;sc[k]+=w;if(w>1)heavy[k]+=w;last[k]=n});
    var order=keys.slice().sort(function(a,b){return sc[b]-sc[a]||heavy[b]-heavy[a]||last[b]-last[a]});
    return{order:order,sc:sc};
  }
  var reduced=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.Quiz={rank:rank,run:function(c){
    var i=0,ans=[],busy=false,E=c.els;
    function render(){
      var q=c.qs[i];
      E.num.textContent="Q"+(i+1)+" / "+c.qs.length;
      E.prog.style.width=(i/c.qs.length*100)+"%";
      E.q.textContent=q.q;E.back.disabled=i===0;E.opts.innerHTML="";
      shuffle(c.keys).forEach(function(k){
        if(!q.a[k])return;
        var b=document.createElement("button");b.type="button";b.className="qz-opt";b.textContent=q.a[k];
        b.onclick=function(){pick(k,b)};E.opts.appendChild(b);
      });
    }
    function pick(k,b){
      if(busy)return;busy=true;b.classList.add("picked");ans[i]=k;
      setTimeout(function(){
        busy=false;i++;
        if(i<c.qs.length)render();
        else{E.prog.style.width="100%";c.onDone(ans.slice(),rank(c.keys,c.qs,ans));}
      },reduced?0:200);
    }
    E.back.onclick=function(){if(i>0){i--;ans.length=i;render()}};
    return{begin:function(){i=0;ans=[];E.start.hidden=true;E.quiz.hidden=false;render();ev("quiz_start",{quiz:c.id})}};
  }};
})();
