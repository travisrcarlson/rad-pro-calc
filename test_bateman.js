const lambdas = [
  4.92e-18, // U-238 (4.468e9 y)
  3.33e-7,  // Th-234 (24.1 d)
  1.73e-5   // Pa-234m (1.17 m)
];

const t_sec = 1000 * 31557600;
const A0 = 10;

const yields = lambdas.map((_n, i) => {
   let activity = 0;
   
   if (i === 0) {
     activity = A0 * Math.exp(-lambdas[0] * t_sec);
   } else {
     const preFactor = lambdas.slice(0, i).reduce((acc, val) => acc * val, 1);
     if (preFactor === 0) return 0;
     
     let sum = 0;
     for (let j = 0; j <= i; j++) {
        let denom = 1;
        for (let p = 0; p <= i; p++) {
           if (p !== j) {
             let diff = lambdas[p] - lambdas[j];
             if (diff === 0) diff = 1e-18; 
             denom *= diff;
           }
        }
        sum += Math.exp(-lambdas[j] * t_sec) / denom;
     }
     
     const N1_0 = lambdas[0] > 0 ? A0 / lambdas[0] : A0;
     const N_n_t = N1_0 * preFactor * sum;
     activity = lambdas[i] > 0 ? N_n_t * lambdas[i] : N_n_t;
   }
   return activity;
});

console.log(yields);
