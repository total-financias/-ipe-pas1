const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({args:['--allow-file-access-from-files']});
const p=await b.newPage({viewport:{width:794,height:1123},deviceScaleFactor:3});
await p.goto('file:///home/user/-ipe-pas1/respeito-em-acao/cartaz/cartaz.html');await p.waitForTimeout(800);
await p.pdf({path:'/home/user/-ipe-pas1/respeito-em-acao/cartaz/cartaz-qrcode.pdf',width:'210mm',height:'297mm',printBackground:true,preferCSSPageSize:true});
await p.screenshot({path:'/home/user/-ipe-pas1/respeito-em-acao/cartaz/cartaz-qrcode.png',fullPage:false});
await b.close();})();
