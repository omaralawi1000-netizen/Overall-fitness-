import { Engine } from '../engine/engine';
import { keepWhenUseful } from '../engine/storage';
import { Saver } from './store';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const phone = $('#phone');
const ASSET = import.meta.env.BASE_URL; // the photo, mask, hero and thumbnail files sit next to the page
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const Q = new URLSearchParams(location.search);
// an animation that is interrupted by the next one is normal here, not an error
window.addEventListener('unhandledrejection', e => { if (e.reason && e.reason.name === 'AbortError') e.preventDefault(); });
const store = { get(k) { try { return localStorage.getItem('a2:' + k); } catch { return null; } }, set(k, v) { try { localStorage.setItem('a2:' + k, v); } catch {} } };
// haptics only where there is a motor: on a desktop the call can hold up a frame for nothing
const HAPTIC = matchMedia('(pointer: coarse)').matches && 'vibrate' in navigator;
let HAPON = store.get('hap') !== '0';
const NAME = (store.get('name') || '').slice(0, 24); // the person's name comes from onboarding (a2:name); nothing about anyone is built in
const buzz = p => { if (!HAPTIC || !HAPON) return; try { navigator.vibrate(p); } catch {} };

/* ================= words, in English and Danish ================= */
const T = {
  en: { today:'Today', train:'Train', fuel:'Fuel', health:'Health', coach:'Coach', reps:'reps', cph:'Copenhagen',
    rkReady:'Readiness', rReady:'Ready.', rNight:'Sleep well.', rkNight:'Readiness at 06:15', rc1:'Slept 7h 12m', rc2:'Resting heart −3 bpm', rc3:'Legs fresh', rcN1:'Your score is ready at 06:15', arcHint:'Drag along your day',
    kAlarm:'Until your 06:15 alarm', kPush:'Until Push · 15:15', kPushL:'Until Push · leave at 14:50', finishP:'Finish Push', trimLate:'You are past the cut, so this Push stays whole', kOn:'Left of Push', kSunset:'Until sunset · {t}', kDinner:'Until dinner · 19:00', tomPlan:'See tomorrow’s plan', kProtein:'Protein left today', kBed:'Until bed · 23:30', kPast:'Past your bedtime',
    hNight:'Night.', hBench:'Bench day.', hGo:'Go time.', hLogged:'Push logged.', hRecover:'Refuel.', hWind:'Wind down.', hLate:'Lights out.',
    lNight1:'Past your 23:30 promise. Sleep now and you still get a full night.', lnBoth:'The rain stops by {a}, and the sky clears by {b}.', lnRain:'The rain stops by {a}.', lnClear:'The sky clears by {b}.', lnPush:'Push is at 15:15.',
    lMorning:'You hit 80 last week. Today the bar says 82.5.', lMid:'Lunch at 12 is the big meal today.',
    lAfternoon:'You finish Push in the last light.', lGrey:'A grey afternoon: Push is the bright part of it.', lSession:'Five lifts, sixteen sets. Start when warm.',
    lAfterDone:'{rec} Eat within the hour, then dinner at 19.', cmpNext:'Next: 40 g of protein within the hour. Pull is on Thursday.', rec0:'Push is in.', rec1:'One record.', recN:'{n} records.', lAfter:'Dinner at 19:00 is your big meal: {p} g of protein still to go.',
    lEvening:'Wrestling tomorrow at 18:00. Bed on time.', lLate:'Tomorrow’s wrestling needs the hours.',
    leave:'Leave 14:50', wake:'Wake', push:'Push', bed:'Bed', sunrise:'Sunrise', sunset:'Sunset', start:'Start Push', resume:'Resume Push', logMeal:'Log a meal',
    clear:'Clear', partly:'Partly cloudy', cloudy:'Cloudy', overcast:'Overcast', drizzle:'Drizzle', rain:'Rain', fog:'Fog',
    plan:'Plan', planSub:'Push · 5 lifts', vsLast:'vs last', fuelK:'Fuel', planDone:'Push · done', weekK:'This week', weekSub:'{n} of 7 sessions', startLate:'Start Push now', planned:'planned 15:15', tapOn:'Tap to continue', todayPlan:'See today’s plan', movePush:'Move Push…', arcMoved:'PUSH · MOVED TO {d}', dThu:'THURSDAY', dTom:'TOMORROW', tomorrowPush:'Push is tomorrow, 15:15', movedT:'Push moved to tomorrow', memK:'Coach remembers',
    mem1:'Bed by 23:30', mem2:'Cutting to 77 kg by December', mem3:'Bench 82.5 × 8 is the number to beat', mem4:'Wrestling Mon and Wed',
    gLeft:'g protein left', kcalOf:'{k} kcal left of 2,300', firstUp:'of 170 g today', nextUp:'{n} at {m} · {p} g', nextMeal:'{n} {m} · {d} · {p} g', otherFood:'+ Other food', todayLog:'Today’s log', logEmpty:'Nothing logged yet. Tap a meal above when you eat it.', alreadyIn:'{n} is already in', fkLine:'{k} kcal left · carbs {c}/{C} g · fat {f}/{F} g', allIn:'All four meals are in',
    days1:['M','T','W','T','F','S','S'], dayT:['Wrestle','Push','Wrestle','Pull','Push','Legs','Pull'],
    trK:'Tuesday · 15:15 · about 55 min', trH:'Push', trP:'Chest, shoulders and triceps. Bench is the main lift today.', sets:'sets', last:'Last', best:'Best', target:'Today', trWeek:'Your week',
    trCoach:['The bar moved fast last week. Same tempo, a little more weight.','Elbows in. Last week’s 28 went up easy.','Stand tall, no hip drive. Match last week first.','Light weight, slow on the way down.','Pin the elbows and squeeze at the bottom.'],
    setHint:'Tap to change the weight or reps. Drag sideways to nudge the weight.', edK:'Weight', edR:'Reps', edDone:'Done', perSide:'{p} a side, on a 20 kg bar', justBar:'Just the 20 kg bar', eachDb:'{w} kg in each hand', pinAt:'Pin at {w} kg',
    exHow:'How to do it', exMus:'What it works', exProg:'Your progress', exUp:'kg in {w} weeks', exFlat:'Steady for {w} weeks', exToday:'Today', exTodayV:'{s} sets × {r} · {w} kg', exTrend:'Top set, week by week',
    sMid:'Set {p} went up clean. Same again.', sGrind:'Set {p} was a fight. Same weight, own every rep.', sLast:'Last set of {ex}. Leave nothing on the bar.', sRecTry:'{w} for {r} is a new best. Breathe, then own it.', sBack:'Back on {ex}. Same as before the break.',
    nextK:'Next time', nextUp:'{ex}: {w} kg × {r}', nextHold:'{ex}: stay at {w} kg, aim for {r}', reschK:'Didn’t fit today', reschP:'{l}. They can go on Thursday with the rest of the week.', reschA:'Add to Thursday', reschD:'Added to Thursday',
    earned:'Earned today', earnedP:'{a} of {b} sets, every one counted.', cRecs:'New bests',
    moveK:'Move Push', moveWhy:'Wrestling is tomorrow at 18:00. Push before it would leave your arms and grip tired for the mat.', optThu:'Thursday, 15:15', optThuS:'A full day after wrestling. Your arms are fresh.', optTom:'Tomorrow, 10:00', optTomS:'Eight hours before wrestling. Keep it to the top sets.', recommended:'Recommended', pushThu:'Push is Thursday, 15:15', pushTom:'Push is tomorrow, 10:00', movedThu:'Push moved to Thursday', movedTom:'Push moved to tomorrow, 10:00', recCoin:'New best',
    fuK:'Tuesday · cutting', fuH:'Fuel', protein:'Protein', carbs:'Carbs', fat:'Fat', logFood:'Log food', meals:'Today’s meals', quick:'Quick add', logBtn:'Log', logged:'Logged',
    breakfast:'Breakfast', lunch:'Lunch', meal:'After training', dinner:'Dinner', mB:'Skyr, oats, berries', mL:'Chicken, rice, salad', mM:'Whey shake, banana', mD:'Salmon, potatoes, greens',
    lsH:'Log food', lsAdd:'Add {g} g', lsPer:'{p} g protein · {k} kcal',
    heK:'Tuesday · sleep, weight, recovery', heH:'Health', pSleep:'Sleep', pWeight:'Weight', pRec:'Recovery', wSleep:'Rested', wWeight:'On pace', wRec:'Ready', sSleep:'90% of your 8-hour goal · 7h 42m in bed', sWeight:'1.4 kg to go to 77 kg', sRec:'Resting heart rate · 3 below normal',
    sleepD:'Last night', deep:'Deep', rem:'REM', light:'Light', awake:'Awake', moonFull:'7 hours or more', moonLess:'Short night', moonNote:'A fuller moon is a longer night · full is 8 hours', lastWk:'Last week', thisWk:'This week', weekMin:'Minutes trained, this week and last', wksAgo:'{n} weeks ago', nights:'Last seven nights', wTrend:'Two weeks', wNote:'−1.2 kg in two weeks. 77 kg by December is on pace.',
    rhr:'Resting heart rate', hrv:'HRV', recNote:'Resting heart rate is 3 below your normal. Train as planned.', src:'From your Galaxy Watch through Health Connect.',
    notNow:'Not now', remembers:'Remembers {n} things', leadNight:'Sleep averaged 6h 53m this week. Bed by 23:30 tonight?', leadSmall:'Your alarm is in {d}. Rest until then; Push at 15:15 is still on.', leadSmallA:'Move the alarm to 06:45', leadSmallD:'Alarm moved to 06:45', leadNightA:'Wind down at 23:00', leadNightD:'Wind-down set for 23:00',
    leadDay:'Bench is ready for 82.5 × 8 today. Leave at 14:50 and you are warm by 15:15.', leadDayA:'Remind me at 14:40', leadDayD:'Reminder set for 14:40',
    leadGo:'The Push window is open. Start now and you finish before sunset.', leadAfter:'Push is in. 25 g of protein in the next hour gets the most from it.', leadAfterA:'Log a whey shake · 25 g', leadAfterD:'Whey shake logged · +25 g',
    leadLate:'Push has not happened yet, and the light is going. Thursday has room for it.', leadLateA:'Move Push to Thursday', leadLateD:'Push moved to Thursday',
    p3:'Bed at 23:00 tonight pulls the week’s sleep back over 7 hours.', setIt:'Set it', bedSet:'Bed reminder set for 23:00', bedSetS:'Set for 23:00', weekLine:'{n} of 7 days done this week',
    coK:'Coach', greetN:'Up late{n}?', greetEarly:'Early start{n}.', greetM:'Morning{n}.', greetA:'Afternoon{n}.', greetE:'Evening{n}.', coP:'Ask about training, food or sleep', send:'Ask',
    q1:'I only have 30 minutes', q2:'What should I eat before Push?', q3:'How is my week?',
    a1:'Then we keep the heavy lifts and cut the small ones. Bench, incline and overhead press, three sets each. About 30 minutes.',
    p1:'Push becomes 30 minutes: bench, incline and overhead press, 3 sets each. Raises and pushdowns move to Thursday.', apply:'Apply', appliedP:'Push is 30 minutes',
    a2:'Skyr 200 g and oats 80 g about 90 minutes before. That is 31 g protein and slow carbs for the bench.', p2:'Log skyr 200 g and oats 80 g for 13:45?', logIt:'Log it',
    a3:'Monday’s wrestling is done and Push is today. Bench is up 2.5 kg in two weeks. Sleep averaged 6h 53m this week, and that is the weak spot.',
    offline:'I’ll answer that in full once I’m connected to your account. For now, try one of the three questions above.', keepS:'Keep plan',
    setH:'Settings', lang:'Language', win:'Sky', live:'Live', shortR:'Short rests', shortS:'10 seconds, for trying it out', replay:'Watch this morning again', on:'On', off:'Off',
    units:'Units', metric:'Metric · kg', windowG:'The window', placeS:'The real sun, moon and weather', skyS:'Live follows the weather', workoutG:'Workout', hap:'Haptics', preview:'preview',
    credit:'Health, sleep and food numbers in this preview are examples. Photo: Kallur lighthouse, Kalsoy, Faroe Islands, by Olegs Jonins on Unsplash. Light: the real sun and moon over Copenhagen. Weather: the Open-Meteo forecast for Copenhagen, saved on 3 November.',
    set:'Set {a} of {b}', logSet:'Log {w} × {r}', skip:'Skip rest', rest:'Rest', nextSet:'Next set', thenEx:'then', lastEx:'Last exercise. Finish strong.', next:'Next',
    coachK:'Coach', coachP:'85 kg for sets 3 and 4? Sets 1 and 2 moved fast.', use85:'Use 85 kg', keep:'Keep 82.5', applied:'Sets 3–4 are 85 kg', undo:'Undo', noSave:'Not saved. Free up space on the phone.',
    oldBest:'old best', sunAfter:'Sunset {s}, {n} minutes after you finish', continue:'Continue', recK:'Heaviest bench ever', recP:'2.5 kg over your best from 20 October. It is on the bench card in Train now.', repBest:'Rep best',
    whole:'Whole workout', hold:'Hold to finish', holding:'Keep holding…', complete:'Push, done.', partialH:'Push · {a} of {b} sets', skippedL:'Not done today: {l}.', someSets:'a few sets', cTime:'Time', cSets:'Sets', cRec:'Records', cRec1:'Record', kgLifted:'kg lifted', doneB:'Back to Today',
    loggedU:'Logged {w} × {r}', savedPush:'Push saved', liveT:'Push · {ex}', liveS:'Set {a} of {b} · resume', liveR:'Resting · {ex}', restOver:'Rest is over · {ex}, set {a}', dayDone:'Done',
    days:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], months:['January','February','March','April','May','June','July','August','September','October','November','December'] },
  da: { today:'I dag', train:'Træn', fuel:'Mad', health:'Sundhed', coach:'Coach', reps:'reps', cph:'København',
    rkReady:'Parathed', rReady:'Klar.', rNight:'Sov godt.', rkNight:'Parathed kl. 06:15', rc1:'Sov 7t 12m', rc2:'Hvilepuls −3 slag', rc3:'Friske ben', rcN1:'Din score er klar kl. 06:15', arcHint:'Træk hen over din dag',
    kAlarm:'Til din alarm kl. 06:15', kPush:'Til Push · 15:15', kPushL:'Til Push · gå kl. 14:50', finishP:'Afslut Push', trimLate:'Du er forbi snittet, så denne Push forbliver hel', kOn:'Tilbage af Push', kSunset:'Til solnedgang · {t}', kDinner:'Til aftensmad · 19:00', tomPlan:'Se morgendagens plan', kProtein:'Protein tilbage i dag', kBed:'Til sengetid · 23:30', kPast:'Over din sengetid',
    hNight:'Nat.', hBench:'Bænkdag.', hGo:'Nu.', hLogged:'Push logget.', hRecover:'Fyld op.', hWind:'Rolig nu.', hLate:'Sluk lyset.',
    lNight1:'Du lovede seng kl. 23:30. Sov nu, så får du stadig en hel nat.', lnBoth:'Regnen stopper ved {a}, og himlen klarer op ved {b}.', lnRain:'Regnen stopper ved {a}.', lnClear:'Himlen klarer op ved {b}.', lnPush:'Push er kl. 15:15.',
    lMorning:'Du tog 80 i sidste uge. I dag siger stangen 82,5.', lMid:'Frokosten kl. 12 er dagens store måltid.',
    lAfternoon:'Du slutter Push i det sidste lys.', lGrey:'En grå eftermiddag: Push er det lyse i den.', lSession:'Fem øvelser, seksten sæt. Start, når du er varmet op.',
    lAfterDone:'{rec} Spis inden for en time, og aftensmad kl. 19.', cmpNext:'Næste: 40 g protein inden for en time. Pull er på torsdag.', rec0:'Push er klaret.', rec1:'Én rekord.', recN:'{n} rekorder.', lAfter:'Aftensmaden kl. 19 er dit store måltid: {p} g protein mangler endnu.',
    lEvening:'Brydning i morgen kl. 18. I seng til tiden.', lLate:'Brydning i morgen kræver timerne.',
    leave:'Gå kl. 14:50', wake:'Vækning', push:'Push', bed:'Seng', sunrise:'Solopgang', sunset:'Solnedgang', start:'Start Push', resume:'Fortsæt Push', logMeal:'Log et måltid',
    clear:'Klart', partly:'Let skyet', cloudy:'Skyet', overcast:'Overskyet', drizzle:'Støvregn', rain:'Regn', fog:'Tåge',
    plan:'Plan', planSub:'Push · 5 øvelser', vsLast:'mod sidst', fuelK:'Mad', planDone:'Push · klaret', weekK:'Denne uge', weekSub:'{n} af 7 træninger', startLate:'Start Push nu', planned:'planlagt 15:15', tapOn:'Tryk for at fortsætte', todayPlan:'Se dagens plan', movePush:'Flyt Push…', arcMoved:'PUSH · FLYTTET TIL {d}', dThu:'TORSDAG', dTom:'I MORGEN', tomorrowPush:'Push er i morgen, 15:15', movedT:'Push flyttet til i morgen', memK:'Coach husker',
    mem1:'Seng kl. 23:30', mem2:'Ned til 77 kg til december', mem3:'Bænk 82,5 × 8 skal slås', mem4:'Brydning man og ons',
    gLeft:'g protein tilbage', kcalOf:'{k} kcal tilbage af 2.300', firstUp:'af 170 g i dag', nextUp:'{n} kl. {m} · {p} g', nextMeal:'{n} {m} · {d} · {p} g', otherFood:'+ Anden mad', todayLog:'Dagens log', logEmpty:'Intet logget endnu. Tryk på et måltid, når du spiser.', alreadyIn:'{n} er allerede logget', fkLine:'{k} kcal tilbage · kulhydrat {c}/{C} g · fedt {f}/{F} g', allIn:'Alle fire måltider er spist',
    days1:['M','T','O','T','F','L','S'], dayT:['Brydn.','Push','Brydn.','Pull','Push','Ben','Pull'],
    trK:'Tirsdag · 15:15 · cirka 55 min', trH:'Push', trP:'Bryst, skuldre og triceps. Bænk er dagens hovedløft.', sets:'sæt', last:'Sidst', best:'Bedst', target:'I dag', trWeek:'Din uge',
    trCoach:['Stangen gik hurtigt i sidste uge. Samme tempo, lidt mere vægt.','Albuerne ind. 28 gik let i sidste uge.','Stå rank, ingen hofte. Match sidste uge først.','Let vægt, langsomt ned.','Hold albuerne og klem i bunden.'],
    setHint:'Tryk for at ændre vægt eller reps. Træk til siden for at justere vægten.', edK:'Vægt', edR:'Reps', edDone:'Færdig', perSide:'{p} i hver side, på en 20 kg stang', justBar:'Kun 20 kg stangen', eachDb:'{w} kg i hver hånd', pinAt:'Stiften ved {w} kg',
    exHow:'Sådan gør du', exMus:'Det træner', exProg:'Din fremgang', exUp:'kg på {w} uger', exFlat:'Stabil i {w} uger', exToday:'I dag', exTodayV:'{s} sæt × {r} · {w} kg', exTrend:'Tungeste sæt, uge for uge',
    sMid:'Sæt {p} gik rent op. Det samme igen.', sGrind:'Sæt {p} var en kamp. Samme vægt, ej hver rep.', sLast:'Sidste sæt {ex}. Giv det hele.', sRecTry:'{w} i {r} er ny rekord. Træk vejret, og tag den.', sBack:'Tilbage til {ex}. Som før pausen.',
    nextK:'Næste gang', nextUp:'{ex}: {w} kg × {r}', nextHold:'{ex}: bliv på {w} kg, gå efter {r}', reschK:'Nåede ikke med i dag', reschP:'{l}. De kan komme med torsdag sammen med resten af ugen.', reschA:'Læg på torsdag', reschD:'Lagt på torsdag',
    earned:'Klaret i dag', earnedP:'{a} af {b} sæt, og hvert eneste tæller.', cRecs:'Nye rekorder',
    moveK:'Flyt Push', moveWhy:'Brydning er i morgen kl. 18.00. Push før det vil gøre arme og greb trætte på måtten.', optThu:'Torsdag kl. 15.15', optThuS:'Et helt døgn efter brydning. Armene er friske.', optTom:'I morgen kl. 10.00', optTomS:'Otte timer før brydning. Hold dig til de tunge sæt.', recommended:'Anbefalet', pushThu:'Push er torsdag kl. 15.15', pushTom:'Push er i morgen kl. 10.00', movedThu:'Push flyttet til torsdag', movedTom:'Push flyttet til i morgen kl. 10.00', recCoin:'Ny rekord',
    fuK:'Tirsdag · vægttab', fuH:'Mad', protein:'Protein', carbs:'Kulhydrat', fat:'Fedt', logFood:'Log mad', meals:'Dagens måltider', quick:'Tilføj hurtigt', logBtn:'Log', logged:'Logget',
    breakfast:'Morgenmad', lunch:'Frokost', meal:'Efter træning', dinner:'Aftensmad', mB:'Skyr, havregryn, bær', mL:'Kylling, ris, salat', mM:'Proteinshake, banan', mD:'Laks, kartofler, grønt',
    lsH:'Log mad', lsAdd:'Tilføj {g} g', lsPer:'{p} g protein · {k} kcal',
    heK:'Tirsdag · søvn, vægt, restitution', heH:'Sundhed', pSleep:'Søvn', pWeight:'Vægt', pRec:'Restitution', wSleep:'Udhvilet', wWeight:'På sporet', wRec:'Klar', sSleep:'90 % af dit mål på 8 timer · 7t 42m i seng', sWeight:'1,4 kg til 77 kg', sRec:'Hvilepuls · 3 under normal',
    sleepD:'I nat', deep:'Dyb', rem:'REM', light:'Let', awake:'Vågen', moonFull:'7 timer eller mere', moonLess:'Kort nat', moonNote:'Jo fuldere måne, jo længere nat · fuld er 8 timer', lastWk:'Sidste uge', thisWk:'Denne uge', weekMin:'Minutter trænet, denne og sidste uge', wksAgo:'for {n} uger siden', nights:'De sidste syv nætter', wTrend:'To uger', wNote:'−1,2 kg på to uger. 77 kg til december er på sporet.',
    rhr:'Hvilepuls', hrv:'HRV', recNote:'Hvilepulsen er 3 under din normale. Træn som planlagt.', src:'Fra dit Galaxy Watch via Health Connect.',
    notNow:'Ikke nu', remembers:'Husker {n} ting', leadNight:'Søvnen var i snit 6t 53m denne uge. I seng kl. 23:30 i aften?', leadSmall:'Din alarm ringer om {d}. Hvil til da; Push kl. 15:15 står stadig.', leadSmallA:'Flyt alarmen til 06:45', leadSmallD:'Alarm flyttet til 06:45', leadNightA:'Slap af fra kl. 23:00', leadNightD:'Afslapning sat til 23:00',
    leadDay:'Bænk er klar til 82,5 × 8 i dag. Gå kl. 14:50, så er du varm kl. 15:15.', leadDayA:'Påmind mig kl. 14:40', leadDayD:'Påmindelse sat til 14:40',
    leadGo:'Push-vinduet er åbent. Start nu, så er du færdig før solnedgang.', leadAfter:'Push er klaret. 25 g protein inden for en time får mest ud af den.', leadAfterA:'Log en proteinshake · 25 g', leadAfterD:'Proteinshake logget · +25 g',
    leadLate:'Push er ikke blevet til noget endnu, og lyset går. Torsdag har plads.', leadLateA:'Flyt Push til torsdag', leadLateD:'Push flyttet til torsdag',
    p3:'I seng kl. 23:00 i aften trækker ugens søvn tilbage over 7 timer.', setIt:'Sæt det', bedSet:'Sengepåmindelse sat til 23:00', bedSetS:'Sat til 23:00', weekLine:'{n} af 7 dage klaret denne uge',
    coK:'Coach', greetN:'Sent oppe{n}?', greetEarly:'Tidligt oppe{n}.', greetM:'Godmorgen{n}.', greetA:'God eftermiddag{n}.', greetE:'God aften{n}.', coP:'Spørg om træning, mad eller søvn', send:'Spørg',
    q1:'Jeg har kun 30 minutter', q2:'Hvad skal jeg spise før Push?', q3:'Hvordan går min uge?',
    a1:'Så beholder vi de tunge løft og dropper de små. Bænk, skrå og skulderpres, tre sæt hver. Cirka 30 minutter.',
    p1:'Push bliver 30 minutter: bænk, skrå og skulderpres, 3 sæt hver. Sideløft og pushdowns flytter til torsdag.', apply:'Gør det', appliedP:'Push er 30 minutter',
    a2:'Skyr 200 g og havregryn 80 g cirka 90 minutter før. Det er 31 g protein og langsomme kulhydrater til bænken.', p2:'Log skyr 200 g og havregryn 80 g kl. 13:45?', logIt:'Log det',
    a3:'Mandagens brydning er klaret, og Push er i dag. Bænk er steget 2,5 kg på to uger. Søvnen var i snit 6t 53m denne uge, og det er det svage punkt.',
    offline:'Det svarer jeg fuldt på, når jeg er koblet til din konto. Prøv indtil videre et af de tre spørgsmål ovenfor.', keepS:'Behold planen',
    setH:'Indstillinger', lang:'Sprog', win:'Himmel', live:'Live', shortR:'Korte pauser', shortS:'10 sekunder, til afprøvning', replay:'Se morgenen igen', on:'Til', off:'Fra',
    units:'Enheder', metric:'Metrisk · kg', windowG:'Vinduet', placeS:'Den rigtige sol, måne og vejr', skyS:'Live følger vejret', workoutG:'Træning', hap:'Vibration', preview:'prøve',
    credit:'Tal for helbred, søvn og mad i denne prøve er eksempler. Foto: Kallur fyr, Kalsoy, Færøerne, af Olegs Jonins på Unsplash. Lys: den rigtige sol og måne over København. Vejr: Open-Meteos prognose for København, gemt 3. november.',
    set:'Sæt {a} af {b}', logSet:'Gem {w} × {r}', skip:'Spring pause over', rest:'Pause', nextSet:'Næste sæt', thenEx:'derefter', lastEx:'Sidste øvelse. Slut stærkt.', next:'Næste',
    coachK:'Coach', coachP:'85 kg i sæt 3 og 4? Sæt 1 og 2 gik hurtigt.', use85:'Brug 85 kg', keep:'Behold 82,5', applied:'Sæt 3–4 er 85 kg', undo:'Fortryd', noSave:'Ikke gemt. Frigør plads på telefonen.',
    oldBest:'gl. rekord', sunAfter:'Solnedgang {s}, {n} minutter efter du er færdig', continue:'Fortsæt', recK:'Tungeste bænk nogensinde', recP:'2,5 kg over din bedste fra 20. oktober. Den står nu på bænkkortet i Træn.', repBest:'Rekord i gentagelser',
    whole:'Hele træningen', hold:'Hold for at afslutte', holding:'Bliv ved…', complete:'Push, færdig.', partialH:'Push · {a} af {b} sæt', skippedL:'Ikke lavet i dag: {l}.', someSets:'et par sæt', cTime:'Tid', cSets:'Sæt', cRec:'Rekorder', cRec1:'Rekord', kgLifted:'kg løftet', doneB:'Tilbage til i dag',
    loggedU:'Logget {w} × {r}', savedPush:'Push gemt', liveT:'Push · {ex}', liveS:'Sæt {a} af {b} · fortsæt', liveR:'Pause · {ex}', restOver:'Pausen er slut · {ex}, sæt {a}', dayDone:'Færdig',
    days:['søndag','mandag','tirsdag','onsdag','torsdag','fredag','lørdag'], months:['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'] }
};
let LANG = Q.get('lang') === 'da' || store.get('lang') === 'da' ? 'da' : 'en';
const t = (k, v) => { let s = (T[LANG][k] ?? T.en[k] ?? k); if (v && typeof s === 'string') for (const n in v) s = s.replace('{' + n + '}', v[n]); return s; };
const num = x => { const s = (Math.round(x * 100) / 100).toString(); return LANG === 'da' ? s.replace('.', ',') : s; };
const kgFmt = w => num(w);
const intFmt = n => Math.round(n).toLocaleString(LANG === 'da' ? 'da-DK' : 'en-US');

/* ================= one spring, run by the browser ================= */
function springCurve(v0 = 0) {
  const k = 380, c = 32; let x = 0, v = v0, tt = 0; const dt = 1 / 960, pts = [[0, 0]]; let nx = 1 / 120;
  while (tt < 2.5) { const a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; tt += dt; if (tt >= nx) { pts.push([tt, x]); nx += 1 / 120; } if (tt > .12 && Math.abs(x - 1) < .0006 && Math.abs(v) < .02) break; }
  pts.push([tt, 1]);
  return { easing: 'linear(' + pts.map(([a, b]) => `${b.toFixed(4)} ${(a / tt * 100).toFixed(2)}%`).join(',') + ')', dur: Math.round(tt * 1000) };
}
const SP = springCurve();
document.documentElement.style.setProperty('--se', SP.easing);
document.documentElement.style.setProperty('--sd', SP.dur + 'ms');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
function go(el, kf, o = {}) {
  const key = o.key || 'go';
  // every animation here names its own starting point, so an interrupted one is simply replaced (committing it would leave inline styles behind)
  el.getAnimations({ subtree: false }).forEach(a => { if (a.__k === key && (o.pseudo || null) === (a.effect.pseudoElement || null)) a.cancel(); });
  const a = el.animate(kf, { duration: RM ? 1 : (o.dur || SP.dur), easing: o.easing || SP.easing, delay: o.delay || 0, fill: 'both', pseudoElement: o.pseudo });
  a.__k = key;
  a.finished.then(() => { if (o.drop) a.cancel(); else if (!o.pseudo && !o.keep) { try { a.commitStyles(); } catch {} a.cancel(); } }).catch(() => {});
  return a;
}
// a soft bloom of light from what you tapped (the one main button, a logged set, an applied change)
function bloom(el, col) { const r = el.getBoundingClientRect(), p = phone.getBoundingClientRect(), b = document.createElement('div'); b.className = 'bloom'; b.style.left = (r.left + r.width / 2 - p.left) + 'px'; b.style.top = (r.top + r.height / 2 - p.top) + 'px'; if (col) b.style.background = `radial-gradient(closest-side,${col},transparent)`; phone.append(b);
  b.animate([{ transform: 'scale(.2)', opacity: .9 }, { transform: 'scale(1.6)', opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.2,.8,.3,1)' }).finished.then(() => b.remove()).catch(() => b.remove()); }
const curT = el => { const m = getComputedStyle(el).transform; return m === 'none' ? 'none' : m; };

/* ================= rolling digits: only the digits that change move ================= */
class Roller {
  constructor(el) { this.el = el; this.s = null; this.cols = []; }
  set(str, o = {}) {
    if (str === this.s) return;
    const prev = this.s; this.s = str;
    const shape = x => x.replace(/\d/g, '0');
    if (prev === null || shape(prev) !== shape(str) || o.instant) { this.build(str, prev !== null && !o.instant); return; }
    [...str].forEach((ch, i) => {
      const c = this.cols[i]; if (!c || !/\d/.test(ch)) return;
      const d = +ch; if (c.d === d) return;
      const up = o.dir ? o.dir > 0 : d > c.d, B = c.b;
      const from = curT(c.strip);
      let target = B + d; if (up && d < c.d) target = 2 * B + d; if (!up && d > c.d) target = d;
      c.d = d;
      go(c.strip, [{ transform: from }, { transform: `translate3d(0,${-target * 100 / (3 * B)}%,0)` }], { key: 'roll', dur: o.dur, delay: o.stagger ? i * o.stagger : 0, keep: true })
        .finished.then(() => { c.strip.style.transform = `translate3d(0,${-(B + d) * 100 / (3 * B)}%,0)`; c.strip.getAnimations().forEach(a => a.cancel()); }).catch(() => {});
    });
  }
  build(str, fade) {
    this.el.textContent = ''; this.cols = [];
    const frag = document.createDocumentFragment();
    [...str].forEach((ch, k) => {
      if (/\d/.test(ch)) {
        const B = str[k - 1] === ':' ? 6 : 10; // the tens of seconds on a clock only hold 0–5, so a roll never passes a time like 2:90
        const col = document.createElement('span'); col.className = 'col';
        const strip = document.createElement('span'); strip.className = 'strip';
        for (let r = 0; r < 3; r++) for (let n = 0; n < B; n++) { const i = document.createElement('i'); i.textContent = n; strip.append(i); }
        strip.style.transform = `translate3d(0,${-(B + +ch) * 100 / (3 * B)}%,0)`;
        col.append(strip); frag.append(col); this.cols.push({ strip, d: +ch, b: B });
      } else {
        const sp = document.createElement('span'); sp.className = /[a-zA-Zæøå]/.test(ch) ? 'ch u' : 'ch'; sp.textContent = ch === ' ' ? ' ' : ch; frag.append(sp); this.cols.push(null);
      }
    });
    this.el.append(frag);
    if (fade) go(this.el, [{ opacity: .2, transform: 'translate3d(0,.06em,0)' }, { opacity: 1, transform: 'none' }], { key: 'fade' });
  }
  spin(str, o = {}) { // a count-up whose big digits lock in first
    this.set(str, { instant: true });
    this.cols.forEach((c, i) => { if (!c) return; c.strip.animate([{ transform: 'translate3d(0,0%,0)' }, { transform: `translate3d(0,${-(c.b + c.d) * 100 / (3 * c.b)}%,0)` }], { duration: (o.base || 900) + i * (o.step || 140), easing: 'cubic-bezier(.12,.7,.2,1)', fill: 'backwards', delay: o.delay || 0 }); });
  }
}

/* ================= the sky: the real sun and moon over Copenhagen (maths after SunCalc) ================= */
const LAT = 55.6761, LON = 12.5683, RAD = Math.PI / 180;
const toDays = d => d.valueOf() / 864e5 - 0.5 + 2440588 - 2451545;
const OB = RAD * 23.4397;
const ra = (l, b) => Math.atan2(Math.sin(l) * Math.cos(OB) - Math.tan(b) * Math.sin(OB), Math.cos(l));
const dec = (l, b) => Math.asin(Math.sin(b) * Math.cos(OB) + Math.cos(b) * Math.sin(OB) * Math.sin(l));
const azm = (H, phi, de) => Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(de) * Math.cos(phi));
const alt = (H, phi, de) => Math.asin(Math.sin(phi) * Math.sin(de) + Math.cos(phi) * Math.cos(de) * Math.cos(H));
const sid = (d, lw) => RAD * (280.16 + 360.9856235 * d) - lw;
function sunC(d) { const M = RAD * (357.5291 + 0.98560028 * d); const L = M + RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + RAD * 102.9372 + Math.PI; return { dec: dec(L, 0), ra: ra(L, 0) }; }
function moonC(d) { const L = RAD * (218.316 + 13.176396 * d), M = RAD * (134.963 + 13.064993 * d), F = RAD * (93.272 + 13.229350 * d); const l = L + RAD * 6.289 * Math.sin(M), b = RAD * 5.128 * Math.sin(F); return { ra: ra(l, b), dec: dec(l, b), dist: 385001 - 20905 * Math.cos(M) }; }
function sunPos(date) { const lw = RAD * -LON, phi = RAD * LAT, d = toDays(date), c = sunC(d), H = sid(d, lw) - c.ra; return { az: azm(H, phi, c.dec) / RAD + 180, alt: alt(H, phi, c.dec) / RAD }; }
function moonPos(date) { const lw = RAD * -LON, phi = RAD * LAT, d = toDays(date), c = moonC(d), H = sid(d, lw) - c.ra; let h = alt(H, phi, c.dec); h += RAD * 0.017 / Math.tan(h + RAD * 10.26 / (h + RAD * 5.10)); return { az: azm(H, phi, c.dec) / RAD + 180, alt: h / RAD }; }
function moonIllum(date) { const d = toDays(date), s = sunC(d), m = moonC(d), sd = 149598000; const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra)); const inc = Math.atan2(sd * Math.sin(phi), m.dist - sd * Math.cos(phi)); return (1 + Math.cos(inc)) / 2; }

/* ================= today's weather: the Open-Meteo forecast for Copenhagen, saved on 3 Nov 2026 ================= */
const WX = { start: Date.UTC(2026, 10, 2, 23),
  cc: [100,100,100,100,100,100,100,100,100,98,73,35,14,2,2,0,0,0,0,0,0,16,51,83, 93,97,99,99,98,98,97,78,3,27,45,3,0,0,14,18,14,38,36,32,25,15,11,4],
  wc: [51,51,51,51,3,3,3,3,3,3,2,1,0,0,0,0,0,0,0,0,0,0,2,3, 3,3,3,3,3,3,3,2,0,1,1,0,0,0,0,0,0,1,1,1,1,0,0,0],
  tp: [10.2,10.1,9.9,9.4,9.3,9.1,8.8,8.6,8.4,8.2,8.3,8.5,8.9,9.3,9.5,9.7,9.6,8.9,7.8,7.2,6.9,6.9,7.1,7.1, 7.2,7.3,6.9,6.6,6.5,6.3,6.2,6.0,5.9,7.2,8.6,9.4,10.2,11.0,11.4,11.2,10.7,9.8,8.6,7.7,7.1,6.8,6.5,6.1],
  vis: [9760,9640,14080,19580,21180,23240,21280,22180,21400,22920,25920,34300,39300,39300,39300,39300,39300,39300,39300,39300,39300,35840,35840,35840, 35840,35840,31720,31720,31720,31720,31720,31720,26620,26620,31720,31720,35840,35840,35840,35840,35840,35840,35840,31740,26640,780,280,200] };
let WXMODE = 'live';
function weatherAt(date) {
  let h = (date - WX.start) / 36e5;
  if (h < 0 || h > 47) h = ((cphMin(date) / 60) % 24 + 24) % 24;
  const i = Math.floor(clamp(h, 0, 46.999)), f = h - i;
  let cloud = lerp(WX.cc[i], WX.cc[i + 1], f) / 100, temp = lerp(WX.tp[i], WX.tp[i + 1], f), vis = lerp(WX.vis[i], WX.vis[i + 1], f), code = WX.wc[Math.round(h)] ?? 0;
  let fog = clamp(1 - (vis - 150) / 1500, 0, 1), rain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) ? (code >= 61 ? .8 : .5) : 0;
  if (WXMODE === 'clear') { cloud = 0; fog = 0; rain = 0; code = 0; }
  if (WXMODE === 'cloudy') { cloud = .86; fog = 0; rain = 0; code = 3; }
  if (WXMODE === 'fog') { cloud = .35; fog = .9; rain = 0; code = 45; }
  if (WXMODE === 'rain') { cloud = 1; fog = .15; rain = .8; code = 61; }
  const word = fog > .5 ? 'fog' : rain ? (code >= 61 ? 'rain' : 'drizzle') : cloud < .2 ? 'clear' : cloud < .6 ? 'partly' : cloud < .9 ? 'cloudy' : 'overcast';
  return { cloud, temp, fog, rain, word };
}

/* ================= time in Copenhagen ================= */
const fmtParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Copenhagen', hour: '2-digit', minute: '2-digit', weekday: 'short', day: 'numeric', month: 'numeric', hourCycle: 'h23' });
function cphMin(d) { const p = fmtParts.formatToParts(d); const g = k => +p.find(x => x.type === k).value; return g('hour') * 60 + g('minute') + d.getSeconds() / 60; }
const hm = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const dateAtMin = m => new Date(Date.now() + (m - cphMin(new Date())) * 6e4);
const nowMin = () => cphMin(new Date());
let sunTimes = { rise: 7 * 60 + 19, set: 16 * 60 + 26 };
function findSunTimes() {
  let rise = null, set = null, prev = sunPos(dateAtMin(0)).alt;
  for (let m = 5; m <= 1440; m += 5) { const a = sunPos(dateAtMin(m)).alt; if (prev < -0.833 && a >= -0.833 && rise === null) rise = m - 5 + 5 * (-0.833 - prev) / (a - prev); if (prev >= -0.833 && a < -0.833) set = m - 5 + 5 * (prev + 0.833) / (prev - a); prev = a; }
  if (rise) sunTimes.rise = rise; if (set) sunTimes.set = set;
}

/* ================= light: sky, land, glass and accent all come from the one light ================= */
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const lin = c => c.map(v => Math.pow(v, 2.2));
const mixv = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
const KEYS = [
  { h: -18, z: '#020409', hz: '#070c18', gl: '#151b36', ga: 0, tint: [.40, .48, .82], ex: .055, haze: '#0b1324', ha: .5, cl: '#0b0e15', acc: '#c5cfe3', gr: '#04060a' },
  { h: -10, z: '#040918', hz: '#0f1d3a', gl: '#2a3360', ga: .22, tint: [.45, .53, .88], ex: .09, haze: '#16264a', ha: .55, cl: '#121622', acc: '#b9c3ef', gr: '#05070d' },
  { h: -5, z: '#0a1834', hz: '#3b4b78', gl: '#c0717c', ga: .55, tint: [.62, .63, .94], ex: .2, haze: '#4a5784', ha: .5, cl: '#2c2f3e', acc: '#cbbcf3', gr: '#070912' },
  { h: -1.5, z: '#18305e', hz: '#b07f88', gl: '#ff8a5c', ga: .8, tint: [.95, .78, .82], ex: .42, haze: '#a07e8d', ha: .45, cl: '#4a4552', acc: '#f4b3a1', gr: '#0a0a10' },
  { h: 2, z: '#2a5a92', hz: '#f0b48a', gl: '#ffa060', ga: .9, tint: [1.18, .93, .74], ex: .74, haze: '#e4b497', ha: .4, cl: '#7a6e6e', acc: '#ffc489', gr: '#0c0b0c' },
  { h: 7, z: '#3a74b0', hz: '#e6cfb6', gl: '#ffd09a', ga: .55, tint: [1.12, 1.0, .88], ex: .92, haze: '#d8d2cc', ha: .36, cl: '#9b9a9e', acc: '#ffd9ab', gr: '#0b0d10' },
  { h: 15, z: '#3f7ebf', hz: '#d4e0ea', gl: '#fff0d8', ga: .35, tint: [1.04, 1.02, 1.0], ex: 1.0, haze: '#cfdbe6', ha: .32, cl: '#a3abb5', acc: '#f2ece3', gr: '#0b0e12' },
  { h: 60, z: '#3f7ebf', hz: '#d4e0ea', gl: '#fff0d8', ga: .3, tint: [1.04, 1.02, 1.0], ex: 1.0, haze: '#cfdbe6', ha: .32, cl: '#a3abb5', acc: '#f2ece3', gr: '#0b0e12' }
].map(k => ({ ...k, z: lin(hex(k.z)), hz: lin(hex(k.hz)), gl: lin(hex(k.gl)), haze: lin(hex(k.haze)), cl: lin(hex(k.cl)), accL: lin(hex(k.acc)), grL: lin(hex(k.gr)) }));
const CAM = 196, HALF = 58, HOR = 582, PXDEG = 24; // the horizon sits under the words, and the sky above it is tall
const toScreen = (az, al) => [215 + (az - CAM) / HALF * 215, HOR - al * PXDEG];
const toHex = c => '#' + c.map(v => Math.round(clamp(Math.pow(v, 1 / 2.2), 0, 1) * 255).toString(16).padStart(2, '0')).join('');
function lightAt(date) {
  const s = sunPos(date), m = moonPos(date), wx = weatherAt(date), frac = moonIllum(date);
  let i = 0; while (i < KEYS.length - 2 && s.alt > KEYS[i + 1].h) i++;
  const A = KEYS[i], B = KEYS[i + 1], f = sstep(A.h, B.h, s.alt);
  const K = k => Array.isArray(A[k]) ? mixv(A[k], B[k], f) : lerp(A[k], B[k], f);
  const cloud = Math.pow(wx.cloud, .9);
  const [sx, sy] = toScreen(s.az, s.alt), [mx, my] = toScreen(m.az, m.alt);
  const night = sstep(-7, -14, s.alt);
  const moonVis = sstep(-1, 3, m.alt) * lerp(.28, 1, sstep(4, -6, s.alt));
  const sunCol = mixv(lin(hex('#ff7a3a')), lin(hex('#fff2df')), sstep(0, 18, s.alt));
  return { s, m, wx, frac, cloud, night, moonVis, sunPx: [sx, sy], moonPx: [mx, my], z: K('z'), hz: K('hz'), gl: K('gl'), ga: K('ga') * (1 - cloud * .75), tint: K('tint'), ex: K('ex'), haze: K('haze'), ha: K('ha'), cl: K('cl'), acc: K('accL'), gr: K('grL'), sunCol,
    disc: (1 - cloud) * sstep(-1.5, .5, s.alt), rim: sstep(-2, 1.5, s.alt) * (1 - sstep(3, 9, s.alt)) * (1 - cloud) /* only a low sun lights the ridge tops */, moonLight: moonVis * frac * night * (1 - cloud) };
}

/* ================= the window: one WebGL pass over the real photo ================= */
const cv = $('#scene');
const gl = cv.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
const FS = `#version 300 es
precision highp float;
uniform vec2 uRes, uSize; uniform sampler2D uPhoto, uMask; uniform vec4 uRect;
uniform vec3 uZ, uH, uGl, uSunC, uTint, uHaze, uGround, uFogC, uCl;
uniform vec2 uSun, uMoon;
uniform float uShade, uGa, uDisc, uMoonVis, uMoonFrac, uMoonAng, uNight, uCloud, uFog, uRain, uExpo, uHa, uRim, uPush, uHor, uMeltA, uMeltB, uSeed, uMoonLight, uLz;
uniform vec2 uLook; // where you look from the window: each tab turns your head a little (x right, y down); near hills shift more than far
out vec4 o;
float h12(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(7.1,3.3); a*=.5; } return s; }
vec3 L(vec3 c){ return pow(c, vec3(2.2)); }
vec3 P(vec2 uv, float lod){
  if(lod < .05) return L(texture(uPhoto, uv).rgb);
  vec2 px = exp2(lod) / vec2(textureSize(uPhoto, 0));
  vec3 s = L(textureLod(uPhoto, uv, lod).rgb) * 2.;
  for(int i=0;i<8;i++){ float a = float(i)*.7854 + .4; s += L(textureLod(uPhoto, uv + vec2(cos(a),sin(a))*px*1.6, lod).rgb); }
  return s / 10.;
}
void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes * uSize;
  float e = clamp((uHor - p.y) / uHor, 0., 1.);
  vec3 sky = mix(uH, uZ, pow(e, .55));
  float ds = length((p - uSun) / vec2(430., 360.));
  sky += uGl * uGa * (exp(-ds*2.4)*.5 + exp(-ds*8.)*.5);
  sky += uGl * uGa * .55 * exp(-pow((p.y - uHor)/85., 2.)) * exp(-abs(p.x - uSun.x)/320.);
  vec3 air = sky; // the sky's own light, without stars, moon or sun disc: distant land takes it on
  vec2 g = floor(p / 3.2); float hs = h12(g + 17.);
  vec2 sp = (g + .2 + .6 * vec2(h12(g + 3.1), h12(g + 7.7))) * 3.2;
  float sz = mix(.38, .9, pow(h12(g * 1.7 + 3.), 3.));
  float st = step(.985, hs) * smoothstep(sz, 0., length(p - sp)) * (.25 + .75 * pow(h12(g + 11.), 2.));
  st += step(.9985, hs) * smoothstep(1.3, 0., length(p - sp)) * .9;
  sky += vec3(.84, .9, 1.) * st * uNight * (1. - uCloud) * smoothstep(uHor - 20., uHor - 140., p.y) * 2.2;
  vec2 dm = p - uMoon; float md = length(dm);
  if(uMoonVis > 0.){
    float rm = 8.5;
    float disc = smoothstep(rm + .9, rm - .5, md);
    vec2 q = dm / rm; float ca = cos(uMoonAng), sa = sin(uMoonAng); vec2 r = vec2(ca*q.x + sa*q.y, -sa*q.x + ca*q.y);
    float z = sqrt(max(0., 1. - r.y*r.y));
    float lit = smoothstep(-.08, .08, r.x - z * (1. - 2.*uMoonFrac));
    float tex = .86 + .14 * fbm(q * 3.1 + 4.);
    vec3 mc = vec3(1., .97, .9) * (.05 + .95 * lit) * tex * 1.7;
    sky = mix(sky, mc, disc * uMoonVis * (1. - uCloud * .92));
    sky += vec3(.55, .65, .9) * exp(-md / 55.) * .16 * uMoonVis * uMoonFrac * (1. - uCloud * .5);
  }
  float sd = length(p - uSun);
  sky += uSunC * (smoothstep(14., 4., sd) * 2.2 + exp(-sd / 22.) * .9) * uDisc; // a soft sun of light, not a second hard disc beside the playhead
  float cn = fbm(p / vec2(300., 80.) + vec2(1.7, 0.)), cn2 = fbm(p / vec2(120., 36.) + vec2(5.3, 2.1));
  vec3 cc = uCl * (.74 + .34 * cn + .14 * cn2) * (1.08 - .22 * e) + uGl * uGa * .3 * exp(-ds * 1.5);
  sky = mix(sky, cc, uCloud);
  sky += vec3(.030, .026, .040) * uCloud * uNight * exp(-max(0., uHor - p.y) / 170.);
  sky *= 1. - uRain * .12;
  air = (mix(air, cc, uCloud) + vec3(.030, .026, .040) * uCloud * uNight * exp(-max(0., uHor - p.y) / 170.)) * (1. - uRain * .12);
  vec3 col = sky;
  vec2 uv = (p - uRect.xy) / uRect.zw;
  if(uv.y > .998) uv.y = 1.996 - uv.y; // below the photo, its own foreground mirrored (and blurred by the melt), never a stretched last row
  if(uv.y > 0.){
    float lod = smoothstep(uMeltA, uMeltB, p.y) * 4.4;
    vec2 an = vec2(.5, 1.05);
    vec2 uF = an + (uv - an) / (1. + uPush * .07 + uLz * .07) + uLook * vec2(.028, .04), uN = an + (uv - an) / (1. + uPush * .17 + uLz * .14) + uLook * vec2(.06, .047); // up and down the layers move almost together: more would open a pale seam above the near hill
    float aF = textureLod(uMask, uF, lod * .8).r, aN = textureLod(uMask, uN, lod * .8).g;
    vec3 land = mix(P(uF, lod), P(uN, lod), aN);
    // under cloud the sun's hard light and shadow in the photo soften toward the land's own average (only inside the land, never at its edge)
    float inner = smoothstep(.9, 1., textureLod(uMask, uF - vec2(0., 10. / uRect.w), 0.).r);
    land = mix(land, L(textureLod(uPhoto, mix(uF, uN, aN), 4.).rgb), uCloud * .36 * inner);
    float lum = dot(land, vec3(.2126, .7152, .0722));
    float a = max(aF, aN);
    float far = (1. - aN) * smoothstep(1., .3, uv.y);
    vec3 lt = land * uTint * uExpo;
    // aerial perspective: far land fades into the air in front of it, so the range always sits in its own sky (overcast, dawn, night)
    lt = mix(lt, mix(uHaze, air, .7 + .3 * uCloud), clamp(far * (uHa + .15 * uCloud + .22 * smoothstep(.22, .5, lum)), 0., .92));
    // where the photo's far range is as pale as its own sky (haze on the cliff tops, the edge of the cut), it takes our sky's
    // exact colour, so the cut can never show as a second, ghosted ridge
    lt = mix(lt, air, smoothstep(.43, .58, lum) * (1. - aN) * .94);
    float above = textureLod(uMask, uF - vec2(0., 1.4 / uRect.w), 0.).r, aF0 = textureLod(uMask, uF, 0.).r;
    lt += uSunC * aF0 * (1. - above) * exp(-abs(p.x - uSun.x) / 120.) * uRim * .7 * (1. - uPush); // a thin line of light, only near the sun
    lt += vec3(.5, .62, .95) * smoothstep(.28, .72, lum) * uMoonLight * .07;
    float fm = clamp(max(uFog * (.3 + .6 * far + .3 * (1. - smoothstep(0., .2, lum))), uFog * .9 * (1. - aN)), 0., .92); // in fog, everything past the near hill goes (the sea too)
    lt = mix(lt, uFogC, fm);
    float ll = dot(lt, vec3(.2126, .7152, .0722));
    lt = mix(lt, vec3(ll), uCloud * .3 + uRain * .14) * (1. - uCloud * .16) * (1. - uRain * .14);
    col = mix(sky, lt, a);
  }
  col *= 1. - .16 * smoothstep(580., 820., p.y);
  // the light itself dims a little in the band where the words sit (countdown, score), so white type holds on the brightest sky
  col *= 1. - uShade * smoothstep(165., 250., p.y) * (1. - smoothstep(470., 580., p.y));
  col = mix(col, uGround, smoothstep(760., uSize.y, p.y) * .8);
  col = mix(col, .86 + .14 * (1. - exp(-(col - .86) * 7.)), step(.86, col));
  vec3 s = pow(max(col, 0.), vec3(1. / 2.2));
  s += (h12(gl_FragCoord.xy + uSeed) + h12(gl_FragCoord.yx * 1.3 + uSeed) - 1.) / 255.;
  o = vec4(s, 1.);
}`;
let prog, U = {}, glReady = false;
function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function initGL() {
  prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(prog, i); U[u.name] = gl.getUniformLocation(prog, u.name); }
}
function tex(img, unit) {
  const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tx;
}
const SIZE = [430, 932], RECT = [0, 190, 430, 648.7]; // Kallur, Kalsoy, Faroe Islands: the far peaks start at y 410
function sizeCanvas() {
  const r = cv.getBoundingClientRect(); const s = parseFloat(getComputedStyle(cv).transform.split('(')[1]) || 1; const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = Math.round(r.width / s * dpr), h = Math.round(r.height / s * dpr);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
}
let scene = { push: 0, look: [0, 0] }, LIGHT = null, frameReq = 0, seed = 0;
// the photo's sun steps back where it would sit on words (the countdown, the score)
const sunNearText = ([x, y]) => 1 - .8 * clamp((210 - Math.abs(x - 215)) / 40, 0, 1) * clamp(Math.min(y - 215, 500 - y) / 40, 0, 1);
function draw() {
  frameReq = 0; if (!glReady || !LIGHT) return;
  const Lt = LIGHT;
  gl.viewport(0, 0, cv.width, cv.height);
  const u3 = (n, v) => U[n] && gl.uniform3f(U[n], v[0], v[1], v[2]);
  const f1 = (n, v) => U[n] && gl.uniform1f(U[n], v);
  gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform2f(U.uSize, SIZE[0], SIZE[1]); gl.uniform4f(U.uRect, ...RECT);
  gl.uniform1i(U.uPhoto, 0); gl.uniform1i(U.uMask, 1);
  u3('uZ', Lt.z); u3('uH', Lt.hz); u3('uGl', Lt.gl); u3('uSunC', Lt.sunCol); u3('uTint', Lt.tint); u3('uHaze', Lt.haze); u3('uGround', Lt.gr); u3('uCl', Lt.cl);
  u3('uFogC', mixv(Lt.haze, Lt.cl, .4).map(v => v * .95));
  gl.uniform2f(U.uSun, ...Lt.sunPx); gl.uniform2f(U.uMoon, ...Lt.moonPx);
  f1('uGa', Lt.ga * (1 - scene.push * .6)); f1('uDisc', Lt.disc * (1 - scene.push) * sunNearText(Lt.sunPx) * .12); /* only a trace of disc: the sun on the path is the playhead */ f1('uMoonVis', Lt.moonVis); f1('uMoonFrac', Lt.frac); f1('uMoonAng', Math.atan2(Lt.sunPx[1] - Lt.moonPx[1], Lt.sunPx[0] - Lt.moonPx[0])); f1('uNight', Lt.night); f1('uCloud', Lt.cloud); f1('uFog', Lt.wx.fog);
  f1('uRain', Lt.wx.rain); f1('uExpo', Lt.ex); f1('uHa', Lt.ha * (1 + Lt.wx.fog)); f1('uRim', Lt.rim); f1('uPush', scene.push); f1('uHor', HOR); f1('uMeltA', 720); f1('uMeltB', 1000);
  f1('uShade', (Lt.wx.fog > .4 ? .34 : Lt.s.alt > -2 ? (Lt.cloud < .7 ? .34 : .2) : .05) * (1 - scene.push)); // stronger by day: the small lines stay readable on a dimmed screen
  f1('uSeed', (seed = (seed + 1) % 97)); f1('uMoonLight', Lt.moonLight); U.uLook && gl.uniform2f(U.uLook, scene.look[0], scene.look[1]); f1('uLz', Math.abs(scene.look[0]));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
const render = () => { if (!frameReq) frameReq = requestAnimationFrame(draw); };
// the rain is drawn once into two small tiles (near: long, sparse, fast; far: short, dense, slow) that loop seamlessly
let rainMade = false;
function rainTile(n, len, wid, alpha, seed) {
  const W0 = 300, H0 = 512, d = Math.min(2, window.devicePixelRatio || 1), c = document.createElement('canvas'); c.width = W0 * d; c.height = H0 * d;
  const x = c.getContext('2d'); x.scale(d, d); x.lineCap = 'round'; x.lineWidth = wid; let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const px = rnd() * W0, py = rnd() * H0, l = len[0] + rnd() * (len[1] - len[0]), a = alpha * (.35 + .65 * rnd());
    for (const oy of [0, -H0]) { const g = x.createLinearGradient(0, py + oy, 0, py + oy + l); g.addColorStop(0, 'rgba(235,242,255,0)'); g.addColorStop(1, `rgba(235,242,255,${a.toFixed(3)})`); x.strokeStyle = g; x.beginPath(); x.moveTo(px, py + oy); x.lineTo(px, py + oy + l); x.stroke(); }
  }
  return c;
}
// the tiles are encoded off the main thread (toBlob), so a shower never stalls a frame
function makeRain() { rainMade = true; const [a, b] = $$('#rain i'); [[a, rainTile(30, [26, 54], 1.3, .5, 3)], [b, rainTile(120, [9, 20], 1, .3, 11)]].forEach(([el, c]) => c.toBlob(bl => { el.style.backgroundImage = `url(${URL.createObjectURL(bl)})`; })); }
let lastAcc = '';
function applyLight(m, cssToo = true) {
  LIGHT = lightAt(dateAtMin(m)); render();
  if (!cssToo) return;
  { const g = $('#dotG stop'); if (g) g.setAttribute('stop-color', LIGHT.s.alt > -2 ? toHex(LIGHT.sunCol.map(v => Math.min(1, v / Math.max(...LIGHT.sunCol)))) : '#ffffff'); } // now glows with the sun's colour by day
  const rn = LIGHT.wx.rain; // the rain follows the real hour, not a finger on the dial (a shower starting mid-drag would cost a frame)
  if (S.scrub === null) phone.classList.toggle('raining', rn > 0);
  if (rn && S.scrub === null) { if (!rainMade) makeRain(); phone.style.setProperty('--rainA', (rn * (LIGHT.s.alt > 0 ? .95 : .62)).toFixed(2)); }
  const acc = toHex(LIGHT.acc), gr = toHex(LIGHT.gr);
  if (acc === lastAcc) return; lastAcc = acc;
  const st = phone.style;
  st.setProperty('--accent', acc); st.setProperty('--ground', gr); st.setProperty('--cv', (LIGHT.s.alt > 0 && LIGHT.cloud < .7 ? .3 : .22).toString());
  st.setProperty('--sat', (LIGHT.s.alt > 8 && LIGHT.cloud < .6 ? 1.12 : LIGHT.s.alt > 0 ? 1.28 : 1.45).toString()); // under a bright blue sky the glass stays glass, not a blue button
  // a soft shade under the word only where the sky behind it is bright: clear day, sunset, fog
  st.setProperty('--rv', (LIGHT.wx.fog > .4 ? .26 : LIGHT.s.alt > -2 ? (LIGHT.cloud < .7 ? .17 : .1) : 0).toString());
  const src = LIGHT.s.alt > -4 ? LIGHT.sunPx : LIGHT.moonVis > .2 ? LIGHT.moonPx : [215, -200];
  st.setProperty('--rimA', Math.round(Math.atan2(src[0] - 215, -(src[1] - 420)) / RAD) + 'deg');
  const rc = LIGHT.s.alt > -4 ? LIGHT.sunCol.map(v => Math.round(lerp(255, Math.pow(v / Math.max(...LIGHT.sunCol), 1 / 2.2) * 255, .5))) : [215, 225, 245];
  st.setProperty('--rimC', LIGHT.cloud > .7 ? '255,255,255' : rc.join(','));
}

/* ================= the day ================= */
const EVENTS = [{ k: 'wake', m: 375 }, { k: 'breakfast', m: 540, meal: 1 }, { k: 'lunch', m: 720, meal: 1 }, { k: 'push', m: 915, e: 970 }, { k: 'meal', m: 990, meal: 1 }, { k: 'dinner', m: 1140, meal: 1 }, { k: 'bed', m: 1410 }];
const MEALS = [{ k: 'breakfast', d: 'mB', m: 540, p: 40, kc: 520, c: 62, f: 12 }, { k: 'lunch', d: 'mL', m: 720, p: 45, kc: 700, c: 80, f: 18 }, { k: 'meal', d: 'mM', m: 990, p: 35, kc: 450, c: 50, f: 8 }, { k: 'dinner', d: 'mD', m: 1140, p: 50, kc: 630, c: 55, f: 22 }];
const FUEL = { target: 170, kcal: 2300, carbs: 247, fat: 70, extra: 0, extraK: 0, extraC: 0, extraF: 0, log: [], manual: new Set() };
const eatenAt = m => MEALS.filter(x => x.m <= m || FUEL.manual.has(x.k));
const proteinLeftAt = m => Math.max(0, FUEL.target - eatenAt(m).reduce((a, x) => a + x.p, 0) - FUEL.extra);
const kcalLeftAt = m => Math.max(0, FUEL.kcal - eatenAt(m).reduce((a, x) => a + x.kc, 0) - FUEL.extraK);
const S = { done: false, live: false, view: 'today', tab: 'today', scrub: null, trimmed: false };
const dur = m => { m = Math.max(0, Math.round(m)); const h = Math.floor(m / 60), mm = m % 60, H = LANG === 'da' ? 't' : 'h'; return h ? `${h}${H} ${String(mm).padStart(2, '0')}m` : `${mm}m`; };
const greyAt = m => { const w = weatherAt(dateAtMin(m)); return w.rain > 0 || w.cloud > .8 || w.fog > .5; }; // no "last light" when there is none
// built from the forecast, so the night line never promises weather that is not coming
function nightLine(m) {
  const at = mm => weatherAt(dateAtMin(mm)), now = at(m); let dry = null, clear = null;
  for (let mm = Math.ceil(m / 60) * 60; mm <= 900; mm += 60) { const w = at(mm); if (dry === null && !w.rain) dry = mm; if (clear === null && w.cloud < .3 && !w.rain && w.fog < .5) clear = mm; }
  if (now.rain && dry !== null) return clear !== null ? t('lnBoth', { a: hm(dry), b: hm(clear) }) : t('lnRain', { a: hm(dry) });
  if (!now.rain && now.cloud >= .3 && clear !== null) return t('lnClear', { b: hm(clear) });
  return t('lnPush');
}
function heroAt(m) {
  if (m < 375) return { k: t('kAlarm'), n: dur(375 - m), c: m < 60 ? t('lNight1') : nightLine(m) };
  // when to leave lives with the countdown, not as a chip in the sentence below it
  if (m < 915 && !S.done) return { k: m >= 600 && m < 890 ? t('kPushL') : t('kPush'), n: dur(915 - m), h: t('hBench'), c: m < 540 ? t('lMorning') : m < 750 ? t('lMid') : greyAt(915) ? t('lGrey') : t('lAfternoon', { sunset: hm(sunTimes.set) }) };
  // the dial only ever counts time; what to eat is said in words below it
  if (m < 970 && !S.done) return { k: t('kSunset', { t: hm(sunTimes.set) }), n: dur(sunTimes.set - m), h: t('hGo'), c: t('lSession') };
  if (m < 1140) return { k: t('kDinner'), n: dur(1140 - m), h: S.done ? t('hLogged') : t('hRecover'), c: S.done ? t('lAfterDone', { rec: recWord() }) : t('lAfter', { p: proteinLeftAt(m) }) };
  if (m < 1410) return { k: t('kBed'), n: dur(1410 - m), h: t('hWind'), c: t('lEvening') };
  return { k: t('kPast'), n: dur(m - 1410), h: t('hLate'), c: t('lLate') };
}
const recWord = () => { const n = W ? W.rec.length : 0; return n === 0 ? t('rec0') : n === 1 ? t('rec1') : t('recN', { n }); };
const bigR = new Roller($('#big'));
function swapText(el, html) {
  if (el.__h === html) return; el.__h = html;
  el.classList.add('out'); clearTimeout(el.__t);
  el.__t = setTimeout(() => { el.firstElementChild.innerHTML = html; el.classList.remove('out'); }, 150);
}
function paintHero(m) {
  const H = heroAt(m);
  bigR.set(H.n); if ($('#kick').textContent !== H.k) $('#kick').textContent = H.k; paintReady(m);
  paintCta(m); swapText($('#coach'), numSans(H.c) + (H.chip ? ` <b class="chip2">${H.chip}</b>` : ''));
}
// one state drives the button: night first, then what is done, then the day's plan
const ctaMode = m => S.live ? 'live' : m < 375 ? 'night' : S.done ? (m >= 1260 ? 'eveDone' : 'done') : S.moved ? 'moved' : m >= 1260 ? 'evening' : m >= 915 ? 'late' : 'start';
function paintCta(m = nowMin()) {
  const md = ctaMode(m); S.cta = md;
  if (paintCta.k === md + LANG) return; paintCta.k = md + LANG;
  const L = { live: [t('resume'), ''], done: [t('logMeal'), ''], moved: [S.movedTo === 'tom' ? t('pushTom') : t('pushThu'), ''], night: [t('todayPlan'), ''], eveDone: [t('tomPlan'), ''], evening: [t('movePush'), ''], late: [t('startLate'), t('planned')], start: [t('start'), ''] }[md];
  $('#ctaL').textContent = L[0]; $('#ctaS').textContent = L[1];
  $('#cta svg').style.display = md === 'start' || md === 'late' || md === 'live' ? '' : 'none';
}
function paintWx(m) {
  const wx = weatherAt(dateAtMin(m));
  const icon = wx.word === 'clear' ? (LIGHT && LIGHT.s.alt > 0 ? '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>' : '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>')
    : wx.word === 'fog' ? '<path d="M7.5 13a4 4 0 01.4-7.9 5 5 0 019.5 1.6A3.3 3.3 0 0117 13z"/><path d="M5 16.5h14M7 20h10"/>' : wx.rain ? '<path d="M7 15.5a4 4 0 01.5-8 5 5 0 019.6 1.5A3.5 3.5 0 0117 16H7.5"/><path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2"/>' : '<path d="M7 18a4.5 4.5 0 01.6-9 5.5 5.5 0 0110.6 1.8A3.8 3.8 0 0118 18z"/>';
  const word = t(wx.word), html = `<svg viewBox="0 0 24 24">${icon}</svg><b>${Math.round(wx.temp)}°</b>${word.length <= 7 ? `<span>${word}</span>` : ""}`; // a long word ("Partly cloudy") would run into AVEN: the icon says it
  if (paintWx.h !== html) { paintWx.h = html; $('#wxB').innerHTML = html; }
}

/* ================= readiness: one word that fills with light as far as you are ready ================= */
function readyAt(m) {
  // from 21:30 the day's score has done its job, and the word turns to tonight
  if (m < 375 || m >= 1290) return { s: null, w: t('rNight'), k: t('rkNight'), f: 1, moon: true, c: [[t('rcN1'), '#9cc4ff']] };
  return { s: 82, w: t('rReady'), k: t('rkReady'), f: 1, c: [[t('rc1'), '#9cc4ff'], [t('rc2'), '#7fe0c0'], [t('rc3'), '#ffbf72']] };
}
let readyF = 0, readyW = '';
function paintReady(m, anim) {
  const R0 = readyAt(m); $('#ready').classList.toggle('moon', !!R0.moon);
  // the score sits beside the word, at headline size. When the word changes too, both change inside the same swap, so the
  // line never re-centres around a new number next to an old, faded word
  const head = () => { if (paintReady.k !== R0.k + R0.s) { paintReady.k = R0.k + R0.s; $('#rk').textContent = R0.k; $('#rkN').textContent = R0.s || ''; } };
  if (R0.w === readyW || !readyW || anim === 'instant') head();
  const fill = () => {
    const lit = $('#rwL'), fv = `${(R0.f * 100).toFixed(1)}%`;
    if (anim === 'draw') { lit.style.setProperty('--f', fv); go(lit, [{ '--f': '0%' }, { '--f': fv }], { key: 'fill', dur: 1500, delay: 350, drop: true, easing: 'cubic-bezier(.3,.7,.15,1)' }); }
    else if (readyF !== R0.f) { const from = getComputedStyle(lit).getPropertyValue('--f') || '0%'; lit.style.setProperty('--f', fv); go(lit, [{ '--f': from }, { '--f': fv }], { key: 'fill', dur: 900, drop: true, easing: 'cubic-bezier(.3,.7,.15,1)' }); }
    else lit.style.setProperty('--f', fv);
    readyF = R0.f;
  };
  if (R0.w !== readyW) {
    const box = $('#ready .lock'), first = !readyW; readyW = R0.w;
    const put = () => { head(); $('#rwD').textContent = R0.w; $('#rwL').textContent = R0.w; $('#rc').innerHTML = R0.c.map(([x, col]) => `<span><i style="background:${col}"></i>${x}</span>`).join(''); fill(); };
    if (first || anim === 'instant') put();
    else { go(box, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(0,.8rem,0)' }], { key: 'sw', dur: 140, keep: true }).finished.then(() => { put(); go(box, [{ opacity: 0, transform: 'translate3d(0,-.8rem,0)' }, { opacity: 1, transform: 'none' }], { key: 'sw' }); }); }
  } else fill();
}
$('#ready').addEventListener('click', () => show('health'));
/* ================= the sun path: your day as a low, wide arc across the sky (never a ring), coloured by its light ================= */
const CX = 215, CY = 205, R = 160, SX = 1.22, SY = .62; // an ellipse: wide like the sun's path, low so it never closes into a gauge
const th = m => (195 - 210 * (m / 1440)) * RAD;
const pt = (m, r = R) => [CX + r * SX * Math.cos(th(m)), CY - r * SY * Math.sin(th(m))];
const arcPath = (m0, m1, r = R) => { const a = pt(m0, r), b = pt(m1, r); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}A${(r * SX).toFixed(1)} ${(r * SY).toFixed(1)} 0 ${(th(m0) - th(m1)) > Math.PI ? 1 : 0} 1 ${b[0].toFixed(1)} ${b[1].toFixed(1)}`; };
const f1 = n => n.toFixed(1);
function buildArc() {
  let s = `<defs><filter id="gw" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter><filter id="tsh" x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.4"/><feComponentTransfer><feFuncA type="linear" slope=".5"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter><radialGradient id="dotG"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`;
  // the arc is drawn in 48 pieces, each the colour of the light at that half hour
  for (let i = 0; i < 48; i++) { const L0 = lightAt(dateAtMin(i * 30 + 15)); const c = mixv(L0.hz, L0.z, .3).map((v, j) => Math.max(v * 1.25 + L0.gl[j] * L0.ga * .4, .16 + j * .03)); s += `<path d="${arcPath(i * 30, i * 30 + 31)}" fill="none" stroke="${toHex(c)}" stroke-width="2.4" stroke-linecap="butt" opacity=".8"/>`; }
  s += `<path id="aEl" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="3" stroke-linecap="round"/>`;
  s += `<path id="aSessG" d="${arcPath(915, 970)}" fill="none" stroke="#ff8d55" stroke-width="12" stroke-linecap="round" opacity=".7" filter="url(#gw)"/>`;
  s += `<path id="aSess" d="${arcPath(915, 970)}" fill="none" stroke="#ff9d6a" stroke-width="9" stroke-linecap="round"/>`;
  { const [x, y] = pt(1410, R + 24); s += `<path d="M${f1(x + 3)} ${f1(y - 5)}a5.5 5.5 0 1 0 0 10a4.2 4.2 0 1 1 0-10z" fill="#f1f4fb" filter="url(#tsh)"/>`; }
  ['rise', 'set'].forEach(k => { const [x, y] = pt(sunTimes[k], R); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="8" fill="#ffcf8a" opacity=".22"/><circle cx="${f1(x)}" cy="${f1(y)}" r="3.4" fill="#ffd59a"/>`; });
  s += `<path id="aNextT" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="2" stroke-linecap="round"/>`;
  s += `<text id="aNext" filter="url(#tsh)" fill="#f4f1ec" font-size="12.5" letter-spacing="1.3" text-anchor="middle" font-weight="600" style="font-family:var(--sans)"></text>`;
  const [lx, ly] = pt(955, R + 44); s += `<text x="${f1(lx)}" y="${f1(ly)}" fill="#ffe6d6" font-size="12.5" letter-spacing="1.5" text-anchor="middle" font-weight="600" filter="url(#tsh)" style="font-family:var(--sans)" id="aLab">${hm(915)} ${t('push').toUpperCase()}</text>`;
  // now is a playhead across the path, not a second sun (the real sun is in the photo)
  s += `<g id="dot"><circle r="22" fill="url(#dotG)" opacity=".7"/><rect x="-3.2" y="-12" width="6.4" height="24" rx="3.2" fill="#fff"/></g>`;
  s += `<g id="dotT" opacity="0"><rect id="dotTb" x="-28" y="-44" width="56" height="24" rx="12" fill="rgba(255,255,255,.16)"/><text id="arcT" y="-27" text-anchor="middle" fill="#fff" class="tab" style="font-family:var(--sans)"></text></g>`;
  $('#arc').innerHTML = s;
}
let dotM = 0;
function labelNext(m) { // the next thing on the day gets a small label on the arc, like Push
  const nx = EVENTS.filter(e => e.k !== 'push' && e.m > m + 10)[0]; const el = $('#aNext'); if (!el) return;
  const hide = () => { if (el.__key) { el.textContent = ''; el.__key = ''; $('#aNextT').setAttribute('d', ''); } };
  if (!nx || nx.k === 'bed' || Math.abs(nx.m - 915) < 90) return hide(); // bed has its moon, and the clock already names it
  const [x, y] = pt(nx.m, R + 40), key = LANG + nx.k;
  if (el.__key !== key) { el.__key = key; el.textContent = hm(nx.m) + ' ' + t(nx.k).toUpperCase(); el.__w = 0; el.__two = false; }
  if (!el.__w) { // a label that would not fit outside the arc on one line stacks its time over its name, so it never crosses the arc
    el.__w = el.getComputedTextLength();
    el.__xy = ''; if (el.__w && (x + el.__w / 2 > 410 || x - el.__w / 2 < 20)) { el.__two = true; el.innerHTML = `<tspan>${hm(nx.m)}</tspan><tspan dy="1.3em">${t(nx.k).toUpperCase()}</tspan>`; el.__w = Math.max(...[...el.children].map(c => c.getComputedTextLength())); }
  }
  const hw = el.__w / 2, X = f1(clamp(x, hw + 20, 410 - hw));
  const Y = f1(el.__two ? y - 22 : y), [px, py] = pt(955, R + 44); if (Math.hypot(+X - px, +Y - py) < 78) return hide(); // never jammed against the Push label
  if (el.__xy === X + Y) return; el.__xy = X + Y;
  const [ax, ay] = pt(nx.m, R - 7), [bx, by] = pt(nx.m, R + 7); $('#aNextT').setAttribute('d', `M${f1(ax)} ${f1(ay)}L${f1(bx)} ${f1(by)}`); // touched only when it moves: an unchanged label must not repaint the arc
  el.setAttribute('x', X); el.setAttribute('y', Y); if (el.__two) [...el.children].forEach(c => c.setAttribute('x', X)); }
function placeDot(m) {
  dotM = m; const [x, y] = pt(m), a = th(m), ang = Math.atan2(-Math.cos(a) / SX, -Math.sin(a) / SY) / RAD; /* the playhead lies along the path's normal */ $('#dot').setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${f1(ang)})`);
  $('#dotT').setAttribute('transform', `translate(${f1(x)} ${f1(y)})`);
  // while you drag, the bubble names what is at that hour
  const near = EVENTS.map(e => ({ m: e.m, l: t(e.k) })).concat([{ m: sunTimes.rise, l: t('sunrise') }, { m: sunTimes.set, l: t('sunset') }]).find(e => Math.abs(e.m - m) < 14);
  const txt = hm(m) + (near ? ' · ' + near.l : ''); if ($('#arcT').textContent !== txt) { $('#arcT').textContent = txt; $('#dotTb').setAttribute('width', $('#dotTb').__w = Math.max(56, txt.length * 7.4 + 22)); $('#dotTb').__dx = null; }
  const bw = $('#dotTb').__w || 56, dx = clamp(x, bw / 2 + 6, 424 - bw / 2) - x; // the bubble slides inward at the ends of the arc
  if ($('#dotTb').__dx !== dx) { $('#dotTb').__dx = dx; $('#dotTb').setAttribute('x', f1(-bw / 2 + dx)); $('#arcT').setAttribute('x', f1(dx)); }
  $('#aEl').setAttribute('d', m > 4 ? arcPath(0, m) : ''); labelNext(m);
}
(() => { // drag the dot: the light, the number and the words follow; let go and the day springs back to now
  const svg = $('#arc'); let id = null, hist = [], lastH = null;
  const minAt = e => { const r = svg.getBoundingClientRect(), sx = 430 / r.width; const x = ((e.clientX - r.left) * sx - CX) / SX, y = (CY - (e.clientY - r.top) * sx) / SY; let a = Math.atan2(y, x) / RAD; if (a < -90) a += 360; return clamp((195 - a) / 210 * 1440, 0, 1439); };
  svg.addEventListener('pointerdown', e => {
    const r = svg.getBoundingClientRect(), sx = 430 / r.width; const d = Math.hypot(((e.clientX - r.left) * sx - CX) / SX, ((e.clientY - r.top) * sx - CY) / SY);
    if (d < R - 70 || d > R + 70) return;
    id = e.pointerId; svg.setPointerCapture(id); springId++; hist = [[performance.now(), minAt(e)]]; $('#arcHint').style.opacity = 0; store.set('arcHint', '1');
    $('#dotT').setAttribute('opacity', '1'); buzz(6); scrubTo(minAt(e));
  });
  svg.addEventListener('pointermove', e => { if (e.pointerId !== id) return; const m = minAt(e); hist.push([performance.now(), m]); if (hist.length > 6) hist.shift(); const h = Math.floor(m / 60); if (lastH !== null && h !== lastH) buzz(3); lastH = h; scrubTo(m); });
  const up = e => { if (e.pointerId !== id) return; id = null; lastH = null; const a = hist[0], b = hist[hist.length - 1]; const v = b && a && b[0] > a[0] ? (b[1] - a[1]) / ((b[0] - a[0]) / 1000) : 0; $('#dotT').setAttribute('opacity', '0'); springBack(v); };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
})();
function scrubTo(m) { S.scrub = m; placeDot(m); applyLight(m, false); paintHero(Math.round(m / 5) * 5); paintWx(m); }
let springId = 0;
function springBack(v0 = 0) { // the dot rides a spring back to now, carrying the finger's speed
  const id = ++springId, target = nowMin(); let x = dotM, v = v0, last = performance.now();
  const k = 380, c = 32; // the shared spring
  const step = now => { if (id !== springId) return; const dt = Math.min(.032, (now - last) / 1000); last = now;
    for (let i = 0; i < 4; i++) { const a = -k * (x - target) - c * v; v += a * dt / 4; x += v * dt / 4; }
    x = clamp(x, 0, 1439);
    if (Math.abs(x - target) < .5 && Math.abs(v) < 3) { S.scrub = null; placeDot(target); applyLight(target); paintHero(target); paintWx(target); return; }
    placeDot(x); applyLight(x, false); paintHero(Math.round(x / 5) * 5); requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ================= Today's cards ================= */
const PUSH = [
  { n: 'Bench press', da: 'Bænkpres', last: [80, 8], best: [82.5, 8], sets: [[80, 8], [82.5, 8], [82.5, 8], [82.5, 8]], rest: 120, hist: [72.5, 75, 75, 77.5, 77.5, 80, 80, 82.5] },
  { n: 'Incline dumbbell press', da: 'Skrå håndvægtspres', last: [28, 10], best: [30, 9], sets: [[30, 10], [30, 10], [30, 10]], rest: 90, hist: [24, 24, 26, 26, 26, 28, 28, 30] },
  { n: 'Overhead press', da: 'Skulderpres', last: [45, 8], best: [47.5, 8], sets: [[47.5, 8], [47.5, 8], [47.5, 8]], rest: 120, hist: [40, 40, 42.5, 42.5, 45, 45, 45, 47.5] },
  { n: 'Lateral raise', da: 'Sideløft', last: [10, 15], best: [12, 12], sets: [[10, 15], [10, 15], [10, 15]], rest: 60, hist: [8, 8, 9, 9, 10, 10, 10, 10] },
  { n: 'Triceps pushdown', da: 'Triceps pushdown', last: [32.5, 12], best: [35, 12], sets: [[35, 12], [35, 12], [35, 12]], rest: 60, hist: [27.5, 27.5, 30, 30, 30, 32.5, 32.5, 35] }
];
const exN = e => LANG === 'da' ? e.da : e.n;
// what each lift is lifted with: kind, the weight step that can really be loaded, and its 3D picture (drawn by the workout build)
const KIT = { 'Bench press': ['bar', 2.5, 'bench'], 'Incline dumbbell press': ['db', 2, 'incline'], 'Overhead press': ['bar', 2.5, 'overhead'], 'Lateral raise': ['db', 1, 'lateral'], 'Triceps pushdown': ['cable', 2.5, 'pushdown'] };
const kitOf = e => KIT[e.n] || ['bar', 2.5, 'bench'];
// how each lift is done, in four cues, and what it works (the first muscle is the main one)
const HOW = {
  'Bench press': { m: ['chest', 'fShoulders', 'triceps'],
    en: ['Eyes under the bar, feet flat, shoulder blades pinched back and down.', 'Hands just outside shoulder width, wrists stacked over the elbows.', 'Lower to your lower chest in about two seconds, elbows at about 45°.', 'Press up and slightly back until the bar is over your shoulders.'],
    da: ['Øjnene under stangen, fødderne fladt, skulderbladene samlet og trukket ned.', 'Hænderne lige uden for skulderbredde, håndleddene over albuerne.', 'Sænk til nederste del af brystet på cirka to sekunder, albuerne i cirka 45°.', 'Pres op og lidt tilbage, til stangen er over skuldrene.'] },
  'Incline dumbbell press': { m: ['uChest', 'fShoulders', 'triceps'],
    en: ['Set the bench to about 30°, and sit with the dumbbells on your knees.', 'Kick them up to your chest, palms forward, shoulder blades back.', 'Press up and slightly in, without clanking them together.', 'Lower slowly to a deep stretch at the chest.'],
    da: ['Stil bænken på cirka 30°, og sid med håndvægtene på knæene.', 'Spark dem op til brystet, håndfladerne frem, skulderbladene tilbage.', 'Pres op og lidt ind, uden at slå dem sammen.', 'Sænk langsomt til et dybt stræk ved brystet.'] },
  'Overhead press': { m: ['shoulders', 'triceps', 'uBack'],
    en: ['Stand tall with the bar on your front shoulders, hands just outside them.', 'Squeeze your glutes and brace your stomach.', 'Press straight up, moving your head back, then through under the bar.', 'Lock out with the bar over the middle of your feet.'],
    da: ['Stå rank med stangen på forreste skuldre, hænderne lige uden for dem.', 'Spænd ballerne, og spænd op i maven.', 'Pres lige op, flyt hovedet tilbage og derefter frem under stangen.', 'Lås ud med stangen over midten af fødderne.'] },
  'Lateral raise': { m: ['sShoulders', 'traps'],
    en: ['Stand with a slight lean forward and soft elbows.', 'Raise the dumbbells out to the sides, elbows leading.', 'Stop at shoulder height and hold for a moment.', 'Lower over two seconds, with no swing.'],
    da: ['Stå med en let fremadlænet krop og bløde albuer.', 'Løft håndvægtene ud til siderne, med albuerne forrest.', 'Stop i skulderhøjde, og hold et øjeblik.', 'Sænk over to sekunder, uden at svinge.'] },
  'Triceps pushdown': { m: ['triceps'],
    en: ['Stand close to the cable, elbows pinned to your sides.', 'Push down until your arms are straight.', 'Squeeze the back of your arms at the bottom.', 'Let your forearms rise to level, keeping the elbows still.'],
    da: ['Stå tæt på kablet, med albuerne låst ind til siden.', 'Pres ned, til armene er strakte.', 'Klem bagsiden af armene i bunden.', 'Lad underarmene komme op til vandret, med albuerne i ro.'] }
};
const MUS = { chest: ['Chest', 'Bryst'], uChest: ['Upper chest', 'Øverste bryst'], fShoulders: ['Front shoulders', 'Forreste skulder'], shoulders: ['Shoulders', 'Skuldre'], sShoulders: ['Side shoulders', 'Sideskulder'], triceps: ['Triceps', 'Triceps'], uBack: ['Upper back', 'Øvre ryg'], traps: ['Traps', 'Kappemuskel'] };
const plan = () => S.trimmed ? PUSH.slice(0, 3).map(e => ({ ...e, sets: e.sets.slice(0, 3) })) : PUSH;
function paintCards() {
  const P = plan();
  $('#cPlan').innerHTML = `<div class="ch3"><span class="k">${t('plan')}</span><span class="serif">${S.done ? t('planDone') : S.trimmed ? t('appliedP') : t('planSub')}</span></div>${shapeOf(P, true)}` +
    P.map(e => { const w = e.sets[e.sets.length - 1][0], d = w - e.last[0]; return `<button class="row" data-go="train"><div><div class="n">${exN(e)}</div><div class="d tab">${e.sets.length} × ${e.sets[0][1]}</div></div><div class="r tab">${kgFmt(w)} kg${d > 0 ? `<small>+${kgFmt(d)} ${t('vsLast')}</small>` : ''}</div></button>`; }).join('');
  const m = nowMin(), pl = proteinLeftAt(m), kl = kcalLeftAt(m);
  $('#cFuel').innerHTML = `<div class="ch3"><span class="k">${t('fuelK')}</span><span class="val tab" id="cfN">${pl} ${t('gLeft')}</span></div>
    <div class="lvl"><i style="background:var(--amber);transform:scaleX(${((FUEL.target - pl) / FUEL.target).toFixed(3)})"></i></div><div class="d" id="cfK" style="font-size:1.35rem;color:var(--ink3);margin:.8rem 0 1.4rem">${t('kcalOf', { k: intFmt(kl) })}</div>
    <div class="chips">${QUICK.slice(0, 4).map((q, i) => `<button class="chip" data-q="${i}">${LANG === 'da' ? q.da : q.n}<small>+${q.p} g</small></button>`).join('')}</div>`;
  const D = [[1, .78], [-1, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], wd = new Date().getDay();
  $('#cWeek').innerHTML = `<div class="ch3"><span class="k">${t('weekK')}</span><span class="val tab">${t('weekSub', { n: 1 + (S.done ? 1 : 0) })}</span></div><div class="week">${t('days1').map((d, i) => { const h = [.62, S.done ? .92 : 0, 0, 0, 0, 0, 0][i] || 0; return `<div class="day ${i === 1 ? 'now' : ''}">${d}<div class="b"><i style="background:${i === 0 ? 'linear-gradient(180deg,#d9c6ff,#8f7bd8)' : 'linear-gradient(180deg,#fff,#c6d3df)'}" data-h="${h}"></i></div><div class="t">${t('dayT')[i]}</div></div>`; }).join('')}</div>`;
  $('#cMem').innerHTML = `<div class="ch3"><span class="k">${t('memK')}</span><span class="serif">Aven</span></div><div class="mems">${['mem1', 'mem2', 'mem3', 'mem4'].map(k => `<span class="mem">${t(k)}</span>`).join('')}</div>`;
  growBars(false);
}
function growBars(anim) { $$('#cWeek .b i').forEach((i, k) => { const h = +i.dataset.h; if (anim) i.animate([{ transform: 'scaleY(0)' }, { transform: `scaleY(${h})` }], { duration: 900, delay: k * 60, easing: SP.easing, fill: 'both' }).finished.then(a => { i.style.transform = `scaleY(${h})`; a.cancel(); }).catch(() => {}); else i.style.transform = `scaleY(${h})`; }); }
$('#sToday').addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) show(g.dataset.go); const q = e.target.closest('[data-q]'); if (q) quickAdd(+q.dataset.q, q, $('#cfN')); });
$('#cta').addEventListener('click', () => { bloom($('#cta')); const md = S.cta;
  if (md === 'done') return show('fuel');
  if (md === 'night' || md === 'moved' || md === 'eveDone') return show('train');
  if (md === 'evening') return openMove($('#cta')); // tomorrow has wrestling: a real choice, not a blind move
  startWorkout(); });
(() => { const sc = $('#sToday'), dim = $('#dim'); let q = 0; sc.addEventListener('scroll', () => { if (q) return; q = requestAnimationFrame(() => { q = 0; dim.style.transition = 'none'; dim.style.opacity = clamp(sc.scrollTop / (46 * remPx()), 0, 1).toFixed(3); sc.classList.toggle('scrolled', sc.scrollTop > 8); }); }, { passive: true }); })();
$('#setB0').addEventListener('click', () => openSheet('setS', $('#setB0'), buildSettings));
$('#wxB').addEventListener('click', () => openSheet('setS', $('#wxB'), buildSettings));
$('#cMem').addEventListener('click', () => show('coach'));

/* ================= food ================= */
const QUICK = [{ n: 'Skyr 200 g', da: 'Skyr 200 g', p: 20, k: 130, c: 8, f: 0 }, { n: '3 eggs', da: '3 æg', p: 19, k: 215, c: 1, f: 15 }, { n: 'Whey shake', da: 'Proteinshake', p: 25, k: 130, c: 3, f: 2 }, { n: 'Chicken 150 g', da: 'Kylling 150 g', p: 46, k: 248, c: 0, f: 5 }, { n: 'Oats 80 g', da: 'Havregryn 80 g', p: 11, k: 300, c: 52, f: 6 }];
const FOODS = [{ n: 'Skyr', da: 'Skyr', p: 10, k: 63, c: 4, f: 0 }, { n: 'Chicken breast', da: 'Kyllingebryst', p: 31, k: 165, c: 0, f: 4 }, { n: 'Oats', da: 'Havregryn', p: 13, k: 372, c: 60, f: 7 }, { n: 'Eggs', da: 'Æg', p: 13, k: 143, c: 1, f: 10 }, { n: 'Rice, cooked', da: 'Ris, kogt', p: 3, k: 130, c: 28, f: 0 }, { n: 'Salmon', da: 'Laks', p: 20, k: 208, c: 0, f: 13 }];
// the food is counted the moment you tap and gets its own id; only the picture waits for the flying amount, so an Undo
// tapped before it lands removes exactly this entry (never the one before it)
let foodId = 0, restoring = false;
function addFood(p, k, c, f, name, paintIn = 0, eid = null) { const id = ++foodId; FUEL.extra += p; FUEL.extraK += k; FUEL.extraC += c; FUEL.extraF += f; eid = eid || 'fd' + Date.now().toString(36) + id; FUEL.log.push({ id, eid, n: name, p, k, c, f, m: nowMin() }); if (!restoring) saveFood({ id: eid, name, p, k, c, f }); if (paintIn) setTimeout(afterFood, paintIn); else afterFood(); return id; }
function removeFood(id) { const i = FUEL.log.findIndex(x => x.id === id); if (i < 0) return; const [x] = FUEL.log.splice(i, 1); unsaveFood(x.eid); FUEL.extra -= x.p; FUEL.extraK -= x.k; FUEL.extraC -= x.c; FUEL.extraF -= x.f; afterFood(); }
function afterFood() { paintHero(nowMin()); paintFuelNums(); const cf = $('#cfN'); if (cf) cf.textContent = `${proteinLeftAt(nowMin())} ${t('gLeft')}`; const ck = $('#cfK'); if (ck) ck.textContent = t('kcalOf', { k: intFmt(kcalLeftAt(nowMin())) }); $$('#cFuel .lvl i').forEach(i => i.style.transform = `scaleX(${((FUEL.target - proteinLeftAt(nowMin())) / FUEL.target).toFixed(3)})`); }
function fly(fromEl, toEl, txt) { // the amount travels from where you tapped into the total
  if (!fromEl || !toEl) return; const r0 = fromEl.getBoundingClientRect(), r1 = toEl.getBoundingClientRect();
  const el = document.createElement('div'); el.textContent = txt; el.style.cssText = `position:fixed;left:${r0.left + r0.width / 2}px;top:${r0.top + r0.height / 2}px;transform:translate(-50%,-50%);font:500 ${1.6 * remPx()}px var(--sans);color:var(--ink);z-index:99;pointer-events:none;white-space:nowrap`;
  document.body.append(el);
  el.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${r1.left + r1.width / 2 - r0.left - r0.width / 2}px),calc(-50% + ${r1.top + r1.height / 2 - r0.top - r0.height / 2}px)) scale(1.5)`, opacity: 0 }], { duration: SP.dur + 160, easing: SP.easing }).finished.then(() => el.remove());
}
function quickAdd(i, btn, target) {
  const q = QUICK[i]; buzz(8); fly(btn.querySelector('small') || btn, target, `+${q.p} g`);
  const id = addFood(q.p, q.k, q.c, q.f, LANG === 'da' ? q.da : q.n, SP.dur * .6);
  toast(`${LANG === 'da' ? q.da : q.n} · +${q.p} g`, () => removeFood(id));
}
const remPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

/* ================= screens ================= */
const ORDER = ['today', 'train', 'fuel', 'health'];
let built = {};
/* the whole app is one window: each tab is a direction you look from it. Train turns toward the ridge, Fuel looks down
   into the valley, Health looks up into the sky, Coach turns away to the quiet side. Near hills move more than far ones */
const LOOKS = { today: [0, 0], train: [.85, -.15], fuel: [-.35, .9], health: [.1, -1], coach: [-.9, .25] };
let lookAnim = 0;
function lookTo([x, y], ms = 1100) {
  const [x0, y0] = scene.look, t0 = performance.now(), id = ++lookAnim;
  if (RM) { scene.look = [x, y]; return render(); }
  const st = () => { if (id !== lookAnim) return; const k = clamp((performance.now() - t0) / ms, 0, 1), e = springAt(k); scene.look = [lerp(x0, x, e), lerp(y0, y, e)]; render(); if (k < 1) requestAnimationFrame(st); };
  requestAnimationFrame(st);
}
function show(tab) {
  if (S.view !== 'today') return;
  closeSheet();
  if (tab === S.tab) { if (tab === 'today') $('#sToday').scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const out = $(`.scr[data-s="${S.tab}"]`), inn = $(`.scr[data-s="${tab}"]`);
  if (!built[tab]) { BUILD[tab](); built[tab] = true; }
  S.tab = tab; phone.dataset.tab = tab; buzz(5); lookTo(LOOKS[tab] || LOOKS.today);
  const i = ORDER.indexOf(tab); $$('.tb').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  if (i >= 0) $('#ind').style.transform = `translate3d(${i * 100}%,0,0)`;
  // the old screen's cards drop away, the new one's rise in one after another (each card fades on its own, never its parent)
  // (the cards move by CSS transitions between real styles: a cancelled script fade could leave a card blank on the compositor)
  out.querySelectorAll('.hdr').forEach(el => go(el, [{ transform: 'none' }, { transform: 'translate3d(0,-12rem,0)' }], { key: 'scr', dur: 220, easing: 'cubic-bezier(.4,0,1,1)', keep: true }));
  out.classList.add('out');
  setTimeout(() => { if (S.tab !== out.dataset.s) { out.classList.remove('on', 'in', 'out'); out.querySelectorAll('.hdr').forEach(el => el.getAnimations().forEach(a => a.cancel())); } }, 230);
  // the new screen starts on the next frame, so the tap's own frame only carries the old one away (two light frames, not one heavy one)
  requestAnimationFrame(() => {
    if (S.tab !== tab) return;
    inn.classList.remove('warm', 'out', 'in'); inn.classList.add('on'); inn.scrollTop = 0;
    inn.querySelectorAll('.rise,.hero>:not(.hdr)').forEach((el, k) => el.style.setProperty('--d', (50 + Math.min(k, 7) * 45) + 'ms'));
    inn.querySelectorAll('.hdr').forEach(el => go(el, [{ transform: 'translate3d(0,-12rem,0)' }, { transform: 'none' }], { key: 'scr', delay: 30, drop: true }));
    void inn.offsetWidth; inn.classList.add('in'); // from their resting place below, one after another
    ENTER[tab] && requestAnimationFrame(() => S.tab === tab && ENTER[tab]()); // and its own moment one frame later still
  });
}
$$('.tb').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
function prewarm(tab) { const sc = $(`.scr[data-s="${tab}"]`); if (!sc || sc.classList.contains('on') || S.view !== 'today') return; sc.classList.add('warm'); clearTimeout(sc.__wt); sc.__wt = setTimeout(() => sc.classList.remove('warm'), 900); }
$$('.tb').forEach(b => b.addEventListener('pointerdown', () => prewarm(b.dataset.tab)));
$('#askB').addEventListener('pointerdown', () => prewarm('coach'));
$('#askX').addEventListener('pointerdown', () => prewarm(S.prevTab || 'today'));
$('#askB').addEventListener('click', () => show('coach'));
$('#askX').addEventListener('click', () => show(S.prevTab || 'today'));
const BUILD = {}, ENTER = {};
BUILD.today = () => {};

/* ---------- Train: the lifts as glass cards that open in place ---------- */
BUILD.train = () => {
  const P = plan(), wd = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  $('#sTrain').innerHTML = `<div class="title rise"><div class="k">${t('trK')}</div><h1>${t('trH')}</h1><p>${S.trimmed ? t('appliedP') : t('trP')}</p></div>
    ${shapeOf(P)}
    <button class="bigb rise" id="trStart"><svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>${S.done ? t('dayDone') : S.live ? t('resume') : t('start')}</button><div class="sp" style="height:2.6rem"></div>
    ${P.map((e, i) => `<button class="exc glass rise" data-x="${i}" aria-haspopup="dialog"><div class="top"><span class="th" style="background-image:url(${ASSET}thumbs/${kitOf(e)[2]}.webp)" aria-hidden="true"></span><span class="nm">${exN(e)}</span><span class="w tab">${kgFmt(e.sets[e.sets.length - 1][0])}<small>kg</small></span></div>
      <div class="meta tab"><span>${e.sets.length} ${t('sets')} × ${e.sets[0][1]}</span><span>${t('last')} ${kgFmt(e.last[0])} × ${e.last[1]}</span></div>
      <div class="dots">${e.sets.map(() => '<i></i>').join('')}</div></button><div class="sp"></div>`).join('')}
    <div class="card glass rise"><div class="k">${t('trWeek')}</div><div class="wk">${t('days1').map((d, i) => `<div class="${i === 1 ? 'now' : ''} ${i === 0 || (i === 1 && S.done) ? 'dn' : ''}"><b>${d}</b>${t('dayT')[i]}</div>`).join('')}</div></div>`;
  $('#trStart').addEventListener('click', () => S.done ? null : startWorkout());
  $$('#sTrain .exc').forEach(c => c.addEventListener('click', () => openExplain(c, P[+c.dataset.x])));
};
/* a lift opens into its explainer, grown out of its card: the picture, how to do it, what it works, how far you have come.
   The picture is the rendered equipment for now; the old app's moving clay figure takes its place once it is rendered */
function buildExplain(e) {
  const H = HOW[e.n], da = LANG === 'da', pic = kitOf(e)[2], h = e.hist, w = h.length, up = +(h[w - 1] - h[0]).toFixed(2), top = e.sets[e.sets.length - 1];
  $('#exIn').innerHTML = `<h4>${exN(e)}<button class="circ close" data-close aria-label="Close" style="background:rgba(255,255,255,.1);width:4.6rem;height:4.6rem"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></h4>
    <div class="ex-hero"><img src="${ASSET}hero/${pic}.webp" alt="" decoding="async"><span class="tg glass tab">${t('exToday')} · ${t('exTodayV', { s: e.sets.length, r: e.sets[0][1], w: kgFmt(top[0]) })}</span></div>
    <div class="ed-k">${t('exHow')}</div><ol class="ex-how">${H[da ? 'da' : 'en'].map(x => `<li>${x}</li>`).join('')}</ol>
    <div class="ed-k">${t('exMus')}</div><div class="ex-mus">${H.m.map((m, i) => `<span class="${i ? '' : 'p'}">${MUS[m][da ? 1 : 0]}</span>`).join('')}</div>
    <div class="ed-k">${t('exProg')}</div>
    <div class="ex-up">${up > 0 ? `<b class="tab">+${kgFmt(up)}</b><small>${t('exUp', { w })}</small>` : `<small>${t('exFlat', { w })}</small>`}</div>
    <div class="ex-sp"><svg class="spark" viewBox="0 0 300 60" preserveAspectRatio="none" aria-label="${t('exTrend')}">${spark(h)}</svg><div class="spl tab"><span>${kgFmt(h[0])} kg · ${t('wksAgo', { n: w })}</span><span>${kgFmt(h[w - 1])} kg</span></div></div>
    <div class="ex-r tab" style="margin-top:1.2rem"><span>${t('best')}</span><b>${kgFmt(e.best[0])} kg × ${e.best[1]}</b></div><div class="ex-r tab"><span>${t('last')}</span><b>${kgFmt(e.last[0])} kg × ${e.last[1]}</b></div>
    <div class="ex-cl">${t('trCoach')[PUSH.findIndex(p => p.n === e.n)]}</div>`;
  $$('#exIn [data-close]').forEach(c => c.addEventListener('click', () => closeSheet()));
  $('#exIn').scrollTop = 0;
  // the line draws itself once the sheet has grown, so the progress reads as a climb
  $('#exIn .spark').animate([{ clipPath: 'inset(-20% 100% -20% 0)' }, { clipPath: 'inset(-20% 0% -20% 0)' }], { duration: RM ? 1 : 900, delay: RM ? 0 : 380, easing: 'cubic-bezier(.45,.05,.2,1)', fill: 'backwards' });
}
function openExplain(card, e) { if (!e || !HOW[e.n]) return; openSheet('exS', card, () => buildExplain(e)); }
// the shape of today's session: one bar per set, as tall as the work in it, grouped by lift, laid on the afternoon's clock
function shapeOf(P, mini) {
  const vol = P.map(e => e.sets.map(([w]) => w)), mx = Math.max(...vol.flat()), /* heavier is taller */ n = P.reduce((a, e) => a + e.sets.length, 0);
  const end = 915 + (S.trimmed ? 30 : 55), done = k => S.done || (W && W.flags[k]);
  let k = 0;
  if (mini) return `<div class="shape mini" aria-hidden="true"><div class="bars">${P.map((e, i) => `<div class="grp2" style="--n:${e.sets.length}">${vol[i].map(v => `<i class="${done(k++) ? 'dn' : ''}" style="height:${(18 + 82 * v / mx).toFixed(1)}%"></i>`).join('')}</div>`).join('')}</div></div>`; // the same shape, small, on Today's Plan card
  return `<div class="shape rise" aria-label="${n} ${t('sets')}"><div class="bars">${P.map((e, i) => `<div class="grp2" style="--n:${e.sets.length}">${vol[i].map(v => `<i class="${done(k++) ? 'dn' : ''}" style="height:${(18 + 82 * v / mx).toFixed(1)}%"></i>`).join('')}<span>${shortName(e)}</span></div>`).join('')}</div>
    <div class="clk tab"><span>15:15</span><i></i><span>${hm(end)}</span></div><div class="sun tab">${t('sunAfter', { s: hm(sunTimes.set), n: Math.max(0, Math.round(sunTimes.set - end)) })}</div></div>`;
}
ENTER.train = () => { $$('#sTrain .shape .bars i').forEach((b, i) => b.animate([{ transform: 'scaleY(0)' }, { transform: 'none' }], { duration: RM ? 1 : SP.dur + 200, delay: 140 + i * 28, easing: SP.easing, fill: 'backwards' })); };
function spark(h) {
  const mn = Math.min(...h) - 1, mx = Math.max(...h) + 1, pts = h.map((v, i) => [i / (h.length - 1) * 300, 56 - (v - mn) / (mx - mn) * 50]);
  let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const cx = (x0 + x1) / 2; d += ` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`; }
  const l = pts[pts.length - 1];
  return `<path d="${d} L300 60 L0 60Z" fill="rgba(255,141,85,.12)"/><path d="${d}" fill="none" stroke="var(--ember)" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${l[0]}" cy="${l[1]}" r="3.5" fill="#fff"/>`;
}
function toggleExc(card) { // the card opens in place: its glass grows by its own clip and the cards below glide (FLIP)
  buzz(5);
  const list = [...$('#sTrain').children], before = new Map(list.map(el => [el, el.getBoundingClientRect().top]));
  const h0 = card.offsetHeight; const opening = !card.classList.contains('open');
  $$('#sTrain .exc.open').forEach(c => { if (c !== card) c.classList.remove('open'); });
  card.classList.toggle('open');
  const h1 = card.offsetHeight;
  list.forEach(el => { const d = before.get(el) - el.getBoundingClientRect().top; if (d && el !== card) go(el, [{ transform: `translate3d(0,${d}px,0)` }, { transform: 'none' }], { key: 'flip' }); });
  if (opening) { go(card, [{ clipPath: `inset(0 0 ${h1 - h0}px 0 round 2.8rem)` }, { clipPath: 'inset(0 0 0px 0 round 2.8rem)' }], { key: 'clip', drop: true }); go(card.querySelector('.more'), [{ opacity: 0, transform: 'translate3d(0,-1rem,0)' }, { opacity: 1, transform: 'none' }], { key: 'in', delay: 60, drop: true });
    // the lift's last weeks draw themselves from left to right, and today's point lands last
    const sv = card.querySelector('.spark'), dot = sv.querySelector('circle');
    sv.animate([{ clipPath: 'inset(-20% 100% -20% 0)' }, { clipPath: 'inset(-20% 0% -20% 0)' }], { duration: RM ? 1 : 950, delay: 200, easing: 'cubic-bezier(.45,.05,.2,1)', fill: 'backwards' });
    dot.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.8)', offset: .55 }, { transform: 'none' }], { duration: RM ? 1 : 520, delay: 1080, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' }); }
  else go(card, [{ clipPath: `inset(0 0 ${h1 - h0}px 0 round 2.8rem)` }, { clipPath: 'inset(0 0 0px 0 round 2.8rem)' }], { key: 'clip', drop: true });
  if (opening) { const r = card.getBoundingClientRect(), lim = $('#dock').getBoundingClientRect().top - 2 * remPx(); if (r.bottom > lim) $('#sTrain').scrollBy({ top: Math.min(r.bottom - lim, r.top - 10 * remPx()), behavior: 'smooth' }); } // the whole card clears the dock
}

/* ---------- Fuel: the day's meals as a skyline on its clock, filled by what you eat (the grammar of Train's sets) ---------- */
let fR = null;
const mealX = m => (clamp(m, 480, 1200) - 480) / 720 * 84 + 8; // 08:00 to 20:00 across the screen
BUILD.fuel = () => {
  const P = Math.max(...MEALS.map(x => x.p));
  $('#sFuel').innerHTML = `<div class="title rise"><div class="k">${t('fuK')}</div><h1>${t('fuH')}</h1></div>
    <div class="fhero rise"><div id="fNum" class="tab"></div><div class="l1">${t('gLeft')}</div><div class="l2" id="fNext"></div></div>
    <div class="msky rise" id="msky"><div class="base"></div><i class="pseg" data-l="${t('push')}" style="left:${mealX(915).toFixed(1)}%;width:${(mealX(970) - mealX(915)).toFixed(1)}%"></i><i class="now" id="fNow"></i>
      ${MEALS.map(x => `<button class="mc" data-mc="${x.k}" style="left:${mealX(x.m).toFixed(1)}%" aria-label="${t(x.k)} ${x.p} g"><span class="bar" style="--h:${(x.p / P).toFixed(3)}"><span class="cl"><i class="fill"></i></span><b class="g tab">${x.p} g</b></span><span class="nm">${t(x.k)}</span><span class="tm tab">${hm(x.m)}</span></button>`).join('')}</div>
    <div class="fquick rise"><div class="chips" id="fChips">${QUICK.slice(0, 3).map((q, i) => `<button class="chip" data-q="${i}">${LANG === 'da' ? q.da : q.n}<small>+${q.p} g</small></button>`).join('')}<button class="chip other" id="logFood">${t('otherFood')}</button></div></div>
    <div class="fk tab rise" id="fK"></div>
    <div class="card glass rise"><div class="k" style="margin-bottom:.6rem">${t('todayLog')}</div><div id="mealList"></div></div>`;
  fR = new Roller($('#fNum'));
  paintFuelNums(true);
};
// delegated once, outside the builder: a rebuild (a language change) must not add a second handler
$('#sFuel').addEventListener('click', e => {
  if (e.target.closest('#logFood')) return openSheet('logS', $('#logFood'), buildLog);
  const q = e.target.closest('[data-q]'); if (q) quickAdd(+q.dataset.q, q, $('#fNum'));
  const c = e.target.closest('[data-mc]'); if (c) { if (eatenAt(nowMin()).some(x => x.k === c.dataset.mc)) { buzz(4); toast(t('alreadyIn', { n: t(c.dataset.mc) })); } else logMeal(c.dataset.mc, c.querySelector('.bar')); } // one tap logs the planned meal, like a set
});
// the meals' columns grow in from the day line, then what you have eaten pours into them in order
ENTER.fuel = () => { $$('#msky .bar').forEach((b, i) => b.animate([{ transform: 'scaleY(0)' }, { transform: 'none' }], { duration: RM ? 1 : SP.dur + 200, delay: 120 + i * 70, easing: SP.easing, fill: 'backwards' })); };
function paintFuelNums(instant) {
  if (!fR) return; const m = nowMin(), pl = proteinLeftAt(m), kl = kcalLeftAt(m), ea = eatenAt(m);
  fR.set(String(pl), instant ? { instant: true } : {});
  const nm = MEALS.find(x => x.m > m && !FUEL.manual.has(x.k));
  $('#fNext').textContent = nm ? t('nextMeal', { n: t(nm.k), m: hm(nm.m), d: t(nm.d), p: nm.p }) : t('allIn');
  // what has been eaten fills the columns in order, so any food (a meal, a shake, the keypad) shows where it lands in the day
  let left = FUEL.target - pl;
  MEALS.forEach(x => { const f = clamp(left / x.p, 0, 1); left -= x.p; const el = $(`#msky [data-mc="${x.k}"]`); if (!el) return; const fill = el.querySelector('.fill'), to = `0 ${((1 - f) * 100).toFixed(1)}%`;
    if (fill.__to !== to) { const from = fill.__to || '0 100%'; fill.style.translate = fill.__to = to; if (!instant) fill.animate([{ translate: from }, { translate: to }], { duration: SP.dur + 200, easing: SP.easing }); }
    el.classList.toggle('full', f >= 1); el.classList.toggle('next', !!nm && nm.k === x.k); });
  $('#fNow').style.left = mealX(m).toFixed(1) + '%'; $('#fNow').style.opacity = m >= 480 && m <= 1200 ? 1 : 0;
  const cb = ea.reduce((a, x) => a + x.c, 0) + FUEL.extraC, ft = ea.reduce((a, x) => a + x.f, 0) + FUEL.extraF;
  $('#fK').textContent = t('fkLine', { k: intFmt(kl), c: cb, f: ft, C: FUEL.carbs, F: FUEL.fat });
  const rows = ea.map(x => ({ m: x.m, n: t(x.k), d: `${t(x.d)} · ${x.p} g` })).concat(FUEL.log.map(x => ({ m: x.m, n: x.n, d: `${x.p} g · ${x.k} kcal` }))).sort((a, b) => a.m - b.m);
  $('#mealList').innerHTML = rows.length ? rows.map(x => `<div class="meal"><span class="tm tab">${hm(x.m)}</span><div><div class="n">${x.n}</div><div class="d">${x.d}</div></div><span class="lg done"><svg viewBox="0 0 20 20"><path d="M4.5 10.5l3.5 3.5 7.5-8"/></svg></span></div>`).join('')
    : `<div class="fempty">${t('logEmpty')}</div>`;
}function logMeal(k, btn) {
  const x = MEALS.find(y => y.k === k); buzz(10); FUEL.manual.add(k);
  if (!mealSaved[k]) { mealSaved[k] = 'pm' + Date.now().toString(36) + k; saveFood({ id: mealSaved[k], name: 'meal:' + k, p: 0, k: 0, c: 0, f: 0 }); }
  btn.animate([{ transform: 'none' }, { transform: 'scale(1.06,1.04)', offset: .35 }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1)' }); // the column answers the tap, then fills
  fly(btn, $('#fNum'), `+${x.p} g`);
  setTimeout(() => { afterFood(); }, SP.dur * .6);
  toast(`${t(x.k)} · +${x.p} g`, () => { FUEL.manual.delete(k); if (mealSaved[k]) { unsaveFood(mealSaved[k]); delete mealSaved[k]; } afterFood(); });
}
// the keypad sheet: each new digit lands with a small settle and the amount re-centres
let LOG = { f: 0, s: '200', fresh: true }, aR = null;
function buildLog() {
  LOG.fresh = true;
  $('#logIn').innerHTML = `<h4>${t('lsH')}<button class="circ close" data-close aria-label="Close" style="background:rgba(255,255,255,.1);width:4.6rem;height:4.6rem"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></h4>
    <div class="foods">${FOODS.map((f, i) => `<button class="chip ${i === LOG.f ? 'on' : ''}" data-f="${i}">${LANG === 'da' ? f.da : f.n}<small>${f.p} g/100</small></button>`).join('')}</div>
    <div class="amt"><span id="aNum" class="tab"></span><span class="u">g</span><div class="pp tab" id="aPP"></div></div>
    <div class="keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(k => k ? `<button data-k="${k}" class="tab">${k}</button>` : '<span></span>').join('')}</div>
    <button class="bigb" id="aAdd"></button>`;
  paintAmt(null);
}
function paintAmt(added) {
  const el = $('#aNum'); const s = LOG.s || '0';
  el.innerHTML = [...s].map(c => `<span class="dg">${c}</span>`).join('');
  if (added === 'add') { const d = el.lastElementChild; d.animate([{ transform: 'translate3d(0,.5em,0) scale(.6)', opacity: 0 }, { transform: 'translate3d(0,-.06em,0) scale(1.04)', offset: .7, opacity: 1 }, { transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.2,.9,.3,1)' }); }
  if (added !== null) el.animate([{ transform: `translate3d(${added === 'add' ? .28 : -.28}em,0,0)` }, { transform: 'none' }], { duration: SP.dur, easing: SP.easing });
  const f = FOODS[LOG.f], g = +s; const p = Math.round(f.p * g / 100), k = Math.round(f.k * g / 100);
  $('#aPP').textContent = t('lsPer', { p, k }); $('#aAdd').textContent = t('lsAdd', { g });
}
$('#logS').addEventListener('click', e => {
  if (e.target.closest('[data-close]')) return closeSheet();
  const f = e.target.closest('[data-f]'); if (f) { LOG.f = +f.dataset.f; $$('#logS [data-f]').forEach(b => b.classList.toggle('on', b === f)); paintAmt(null); buzz(4); }
  const k = e.target.closest('[data-k]'); if (k) { buzz(3); const v = k.dataset.k; if (v === '⌫') { LOG.s = LOG.s.slice(0, -1); paintAmt('del'); } else if (LOG.fresh || LOG.s.length < 4) { LOG.s = (LOG.fresh || LOG.s === '0' ? '' : LOG.s) + v; LOG.fresh = false; paintAmt('add'); } }
  if (e.target.closest('#aAdd')) { const fd = FOODS[LOG.f], g = +LOG.s || 0; if (!g) return; const p = Math.round(fd.p * g / 100), kc = Math.round(fd.k * g / 100), cb = Math.round(fd.c * g / 100), ft = Math.round(fd.f * g / 100); const nm = `${LANG === 'da' ? fd.da : fd.n} ${g} g`;
    buzz(10); fly($('#aNum'), $('#fNum') || $('#cfN'), `+${p} g`); closeSheet(); const id = addFood(p, kc, cb, ft, nm, SP.dur * .6); toast(`${nm} · +${p} g`, () => removeFood(id)); }
});

/* ---------- Health: ring, number, word and colour move together as you swipe ---------- */
const HP = [
  { k: 'pSleep', n: '7h 12m', w: 'wSleep', f: .9, c: '#9cc4ff', s: 'sSleep' },
  { k: 'pWeight', n: '78.4kg', w: 'wWeight', f: .62, c: '#7fe0c0', s: 'sWeight' },
  { k: 'pRec', n: '52', w: 'wRec', f: .82, c: '#ffbf72', u: 'bpm', s: 'sRec' }
];
const HRC = 2 * Math.PI * 107;
BUILD.health = () => {
  const wt = [79.6, 79.4, 79.5, 79.2, 79.1, 79.2, 78.9, 78.8, 78.9, 78.7, 78.6, 78.6, 78.5, 78.4];
  $('#sHealth').innerHTML = `<div class="title rise"><div class="k">${t('heK')}</div><h1>${t('heH')}</h1></div>
    <div class="pager rise" id="pager">${HP.map((p, i) => `<div class="pgp"><div class="hpan glass" style="--pc:${p.c}"><div class="lb">${t(p.k)}</div><div class="num tab">${(LANG === 'da' ? p.n.replace('.', ',').replace(/(\d)h/g, '$1t') : p.n).replace(/([a-z]+)/g, '<span class="u">$1</span>')}${p.u ? `<span class="u">${p.u}</span>` : ''}</div>
      <div class="rw"><span class="dim">${t(p.w)}</span><span class="lit hl" data-f="${p.f}" aria-hidden="true">${t(p.w)}</span></div><div class="sub">${t(p.s)}</div>${p.k === 'pSleep' ? moonsRow() : ''}</div></div>`).join('')}</div>
    <div class="pdots rise" id="pdots"><i class="on"></i><i></i><i></i></div><div class="sp"></div>
    <div class="card glass rise" id="hDet"></div>`;
  hDetail(0, true);
  const pg = $('#pager'); let raf = 0, cur = 0;
  pg.addEventListener('scroll', () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const x = pg.scrollLeft / pg.clientWidth; healthTint(x); const i = Math.round(x); if (i !== cur) { cur = i; $$('#pdots i').forEach((d, k) => d.classList.toggle('on', k === i)); hDetail(i); buzz(4); } }); }, { passive: true });
  WT = wt;
};
let WT = [];
function healthTint(x) { [0, 1, 2].forEach(i => { $('#tH' + i).style.opacity = clamp(1 - Math.abs(x - i), 0, 1).toFixed(3); }); }
ENTER.health = () => { const pg = $('#pager'); healthTint(pg ? pg.scrollLeft / pg.clientWidth : 0);
  const rb = $('#sHealth .rib'); if (rb) rb.animate([{ clipPath: 'inset(0 100% 0 0 round 1rem)' }, { clipPath: 'inset(0 0% 0 0 round 1rem)' }], { duration: RM ? 1 : 1300, delay: 320, easing: 'cubic-bezier(.45,.05,.2,1)', fill: 'backwards' }); /* the night passes left to right */
 $$('#sHealth .hl').forEach((l, i) => { const to = `${(+l.dataset.f * 100).toFixed(1)}%`; l.style.setProperty('--f', to); l.animate([{ '--f': '0%' }, { '--f': to }], { duration: 1400, delay: 200 + i * 60, easing: 'cubic-bezier(.3,.7,.15,1)', fill: 'backwards' }); }); };
// last night as one ribbon, coloured by how deep you slept from minute to minute (not bars by stage)
const NIGHT = [['l', 20], ['d', 30], ['l', 25], ['r', 15], ['a', 5], ['l', 30], ['d', 25], ['l', 20], ['r', 25], ['l', 35], ['d', 17], ['l', 25], ['r', 30], ['a', 10], ['l', 35], ['r', 44], ['a', 15], ['l', 56]];
// the last seven nights, ending with last night on the right (never nights still to come)
const nightDays = () => { const d = t('days1'); return d.slice(1).concat(d.slice(0, 1)); };
// the last seven nights as moons: the longer the sleep, the fuller and larger (the sleep hero's own picture)
const moonPath = f => { const r = 10, rx = (r * Math.abs(2 * f - 1)).toFixed(2); return `M12 2A${r} ${r} 0 0 1 12 22A${rx} ${r} 0 0 ${f > .5 ? 1 : 0} 12 2Z`; }; // lit from the right, waxing to full at 8 hours
const moonsRow = () => `<div class="moons">${[7.7, 6.6, 7.1, 6.2, 7.0, 6.4, 7.2].map((v, k) => { const f = clamp((v - 5) / 3, .06, 1); /* five hours is a sliver, eight is full */ return `<div title="${v} h" class="${k === 6 ? 'ln' : ''}"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="rgba(255,255,255,.1)"/><path d="${moonPath(f)}" fill="#e4ecff"/></svg><span>${nightDays()[k]}</span></div>`; }).join('')}</div><div class="mnote">${t('moonNote')}</div>`;
function ribbon() {
  const C = { d: '#4f6fd8', r: '#9cc4ff', l: 'rgba(156,196,255,.34)', a: 'rgba(255,246,230,.8)' }, tot = NIGHT.reduce((a, x) => a + x[1], 0); let at = 0;
  // one colour stop at the middle of each stretch, so the night flows from one depth to the next instead of striping
  return 'linear-gradient(90deg,' + NIGHT.map(([k, m]) => { const a = at / tot * 100, b = (at += m) / tot * 100; return `${C[k]} ${(a + .25).toFixed(2)}% ${(b - .25).toFixed(2)}%`; }).join(',') + ')';
}
const hT = x => LANG === 'da' ? x.replace(/(\d)h/g, '$1t') : x;
function hDetail(i, instant) {
  const box = $('#hDet');
  const html = i === 0 ? `<div class="ch3"><span class="k">${t('sleepD')}</span><span class="val tab">22:33 – 06:15</span></div>
      <div class="rib" style="background:${ribbon()}"></div><div class="ribT tab"><span>☾ 22:33</span><span>00:00</span><span>02:00</span><span>04:00</span><span>06:15</span></div>
      <div class="legend"><span><b style="background:#4f6fd8"></b>${t('deep')} ${hT('1h 12m')}</span><span><b style="background:#9cc4ff"></b>${t('rem')} ${hT('1h 54m')}</span><span><b style="background:rgba(156,196,255,.34)"></b>${t('light')} ${hT('4h 06m')}</span><span><b style="background:rgba(255,246,230,.8)"></b>${t('awake')} 30m</span></div>
      <div class="src">${t('src')}</div>`
    : i === 1 ? `<div class="ch3"><span class="k">${t('wTrend')}</span><span class="val tab" id="wVal">${num(78.4)} kg</span></div><div class="chart" id="wChart"><svg viewBox="0 0 380 130" preserveAspectRatio="none" id="wSvg"></svg><div id="hair"></div><div id="bub" class="tab"></div></div><div class="src">${t('wNote')}</div>`
    : `<div class="ch3"><span class="k">${t('rhr')}</span><span class="val tab">52 bpm</span></div><div class="row"><div class="n">${t('hrv')}</div><div class="r tab">64 ms</div></div><div class="row"><div class="n">${t('rhr')}</div><div class="r tab">52 · 55 · 54 · 53 · 52</div></div><div class="src">${t('recNote')} ${t('src')}</div>`;
  if (instant) { box.innerHTML = html; if (i === 1) wChart(); return; }
  go(box.firstElementChild ? box : box, [{ opacity: 1 }, { opacity: 1 }], { key: 'noop', dur: 1 });
  const kids = [...box.children]; kids.forEach(k => k.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }));
  setTimeout(() => { const h0 = box.offsetHeight; box.innerHTML = html; if (i === 1) wChart(); const h1 = box.offsetHeight; [...box.children].forEach((k, n) => k.animate([{ opacity: 0, transform: 'translate3d(0,.8rem,0)' }, { opacity: 1, transform: 'none' }], { duration: SP.dur, delay: n * 30, easing: SP.easing, fill: 'backwards' }));
    if (h1 !== h0) go(box, [{ clipPath: `inset(0 0 ${Math.max(0, h1 - h0)}px 0 round 3rem)` }, { clipPath: 'inset(0 0 0px 0 round 3rem)' }], { key: 'clip', drop: true }); }, 120);
}
function wChart() { // a smooth trend you can scrub: a hairline follows the finger and the line glows near it
  const W2 = 380, H2 = 120, mn = Math.min(...WT) - .2, mx = Math.max(...WT) + .2, pts = WT.map((v, i) => [i / (WT.length - 1) * W2, H2 - (v - mn) / (mx - mn) * (H2 - 10)]);
  let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const cx = (x0 + x1) / 2; d += ` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`; }
  $('#wSvg').innerHTML = `<defs><linearGradient id="wg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7fe0c0" stop-opacity=".28"/><stop offset="1" stop-color="#7fe0c0" stop-opacity="0"/></linearGradient><radialGradient id="glo"><stop offset="0" stop-color="#7fe0c0" stop-opacity=".9"/><stop offset="1" stop-color="#7fe0c0" stop-opacity="0"/></radialGradient></defs>
    <path d="${d} L${W2} 130 L0 130Z" fill="url(#wg)"/><path d="${d}" fill="none" stroke="#7fe0c0" stroke-width="2.4" vector-effect="non-scaling-stroke"/><circle id="gDot" r="16" fill="url(#glo)" opacity="0"/><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="4" fill="#fff"/>`;
  const ch = $('#wChart');
  const at = e => { const r = ch.getBoundingClientRect(); const x = clamp((e.clientX - r.left) / r.width, 0, 1); const i = Math.round(x * (WT.length - 1)); const p = pts[i];
    $('#hair').style.transform = `translateX(${p[0] / W2 * r.width}px)`; $('#bub').style.left = `${p[0] / W2 * 100}%`; $('#bub').textContent = `${num(WT[i])} kg · ${i === WT.length - 1 ? t('today') : `−${WT.length - 1 - i}d`}`;
    const g = $('#gDot'); g.setAttribute('cx', p[0]); g.setAttribute('cy', p[1]); g.setAttribute('opacity', '1'); $('#wVal').textContent = `${num(WT[i])} kg`; };
  ch.addEventListener('pointerdown', e => { ch.classList.add('on'); ch.setPointerCapture(e.pointerId); at(e); buzz(4); });
  ch.addEventListener('pointermove', e => { if (ch.classList.contains('on')) at(e); });
  const up = () => { ch.classList.remove('on'); $('#gDot').setAttribute('opacity', '0'); $('#wVal').textContent = `${num(78.4)} kg`; };
  ch.addEventListener('pointerup', up); ch.addEventListener('pointercancel', up);
}

/* ---------- Coach: the light rises, and the Ask bar becomes the conversation ---------- */
BUILD.coach = () => {
  const m = nowMin(), g = m < 300 ? 'greetN' : m < 375 ? 'greetEarly' : m < 720 ? 'greetM' : m < 1020 ? 'greetA' : 'greetE';
  // the Coach speaks first: one line built from his own numbers, one action, and a quiet way out
  const L = coachLead(m), qs = m < 915 && !S.done ? [1, 2] : [3, 2];
  $('#sCoach').innerHTML = `<div class="title rise"><div class="k">${t('coK')}</div><div class="greet">${t(g, { n: NAME ? ', ' + NAME : '' })}</div></div>
    <div class="lead rise" id="lead"><p class="say">${numSans(L.line)}</p><div class="r"><button class="use" id="leadGo"><span class="lb">${L.act}</span></button><button class="keep" id="leadNo">${t('notNow')}</button></div></div>
    <button class="memo rise" id="memo" aria-expanded="false"><span>${t('remembers', { n: 4 })}</span><svg class="chev" viewBox="0 0 8 13"><path d="M1.5 1.5l5 5-5 5"/></svg></button>
    <div class="mems memL" id="memL">${['mem1', 'mem2', 'mem3', 'mem4'].map(k => `<span class="mem">${t(k)}</span>`).join('')}</div>
    <div class="sugg rise" id="sugg">${qs.map(n => `<button data-a="${n}">${t('q' + n)}<svg class="chev" viewBox="0 0 8 13" aria-hidden="true"><path d="M1.5 1.5l5 5-5 5"/></svg></button>`).join('')}</div>
    <div class="thread" id="thread"></div>`;
  $('#sCoach').__lead = L;
  $('#askI').placeholder = t('coP'); $('#askGo').textContent = t('send');
};
$('#sCoach').addEventListener('click', e => {
  if (e.target.closest('#memo')) { const o = $('#memo').getAttribute('aria-expanded') !== 'true'; $('#memo').setAttribute('aria-expanded', o); $('#memL').classList.toggle('on', o); buzz(4); return; }
  if (e.target.closest('#leadNo')) { const ld = $('#lead'); go(ld, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(0,-1rem,0)' }], { key: 'in', dur: 200, keep: true }).finished.then(() => ld.remove()).catch(() => {}); return; }
  const lg = e.target.closest('#leadGo'); if (lg) return leadAct(lg);
  const q = e.target.closest('[data-a]'); if (q) { $('#sugg').classList.add('used'); ask(+q.dataset.a, q.textContent.trim()); } /* the suggestions leave once a conversation starts */ const ap = e.target.closest('[data-apply]'); if (ap) applyProp(+ap.dataset.apply, ap); const ks = e.target.closest('[data-keep]'); if (ks) { ks.closest('.prop').remove(); } });
// what the Coach opens with, from the hour and the day so far
function coachLead(m) {
  if (m < 375) return { k: 'small', line: t('leadSmall', { d: dur(375 - m) }), act: t('leadSmallA') }; // after midnight: speak to the alarm, not to tonight
  if (m >= 1290) return { k: 'night', line: t('leadNight'), act: t('leadNightA') };
  if (S.done) return { k: 'after', line: t('leadAfter'), act: t('leadAfterA') };
  if (m < 915) return { k: 'day', line: t('leadDay'), act: t('leadDayA') };
  if (m < 990) return { k: 'go', line: t('leadGo'), act: t('start') };
  return { k: 'late', line: t('leadLate'), act: t('leadLateA') };
}
function leadAct(btn) {
  if (btn.disabled) return; btn.disabled = true; buzz(10); const L = $('#sCoach').__lead || coachLead(nowMin()), lb = btn.querySelector('.lb');
  const done = txt => { go(lb, [{ opacity: 1 }, { opacity: 0 }], { key: 'lb', dur: 120 }).finished.then(() => { lb.textContent = '✓ ' + txt; go(lb, [{ opacity: 0 }, { opacity: 1 }], { key: 'lb', dur: 200 }); }).catch(() => {}); };
  const undo = () => { btn.disabled = false; lb.textContent = L.act; };
  if (L.k === 'go') { btn.disabled = false; return startWorkout(); }
  if (L.k === 'after') { const id = addFood(25, 120, 3, 2, LANG === 'da' ? 'Proteinshake' : 'Whey shake'); done(t('leadAfterD')); return toast(t('leadAfterD'), () => { removeFood(id); undo(); }); }
  if (L.k === 'late') { S.moved = true; paintCta.k = ''; paintCta(); done(t('leadLateD')); return toast(t('leadLateD'), () => { S.moved = false; paintCta.k = ''; paintCta(); undo(); }); }
  const D = t({ night: 'leadNightD', small: 'leadSmallD' }[L.k] || 'leadDayD'); done(D); toast(D, undo);
}
// numbers in the Coach's voice are set in the sans, so a figure never hides inside the italic
const numSans = txt => txt; const numSansOld = txt => txt.replace(/(\d[\d.,:]*(?:\s?(?:kg|min|bpm|g|%)(?![a-zæøå])|[hmt](?![a-zæøå]))?)/gi, '<b class="num">$1</b>');
ENTER.coach = () => { buzz(8); setTimeout(() => $('#askI').focus({ preventScroll: true }), SP.dur + 200); };
$('#askBar').addEventListener('submit', e => { e.preventDefault(); const v = $('#askI').value.trim(); if (!v) return; $('#askI').value = ''; $('#askI').blur(); ask(0, v); });
function ask(n, q) {
  const th = $('#thread'); const me = document.createElement('div'); me.className = 'me'; me.textContent = q; th.append(me);
  me.animate([{ transform: 'translate3d(0,1.2rem,0) scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: SP.dur, easing: SP.easing });
  const thk = document.createElement('div'); thk.className = 'think'; thk.innerHTML = '<i></i>'; th.append(thk); $('#askBar').classList.add('listen');
  const sc = $('#sCoach'); sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
  setTimeout(() => {
    thk.remove(); $('#askBar').classList.remove('listen');
    const txt = n === 1 ? t('a1') : n === 2 ? t('a2') : n === 3 ? t('a3') : t('offline');
    const a = document.createElement('div'); a.className = 'ans'; a.innerHTML = txt.split(' ').map((w, i) => `<span class="w" style="animation-delay:${i * 26}ms">${numSans(w)}</span>`).join(' ');
    th.append(a);
    if (n === 3) { const c = document.createElement('div'); c.className = 'card glass'; c.innerHTML = `<div class="k">${t('weekK')}</div>${weekPills()}`; th.append(c); c.animate([{ transform: 'translate3d(0,1.6rem,0)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: SP.dur, delay: 500, easing: SP.easing, fill: 'backwards' }); c.querySelectorAll('.wp').forEach((r, i) => r.animate([{ transform: 'translate3d(0,.8rem,0)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: SP.dur, delay: 620 + i * 50, easing: SP.easing, fill: 'backwards' })); }
    if (n >= 1 && n <= 3) { const p = document.createElement('div'); p.className = 'prop glass'; p.innerHTML = `<p>${t('p' + n)}</p><div class="r"><button class="use" data-apply="${n}"><span class="lb">${n === 1 ? t('apply') : n === 2 ? t('logIt') : t('setIt')}</span></button><button class="keep" data-keep>${t('keepS')}</button></div>`; th.append(p);
      p.animate([{ clipPath: 'inset(0 0 100% 0 round 2.4rem)' }, { clipPath: 'inset(0 0 0% 0 round 2.4rem)' }], { duration: SP.dur + 100, delay: 420, easing: SP.easing, fill: 'backwards' }); }
    setTimeout(() => sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' }), 80);
  }, 1000);
}
// the week as seven labelled days (what, and whether it happened), instead of unlabelled bars
function weekPills() {
  const dn = [true, S.done], d = t('days1'), w = t('dayT');
  return `<div class="wpills">${d.map((x, i) => `<div class="wp ${dn[i] ? 'dn' : ''} ${i === 1 ? 'now' : ''}"><b>${x}</b><span>${w[i]}</span><i></i></div>`).join('')}</div><div class="src">${t('weekLine', { n: dn.filter(Boolean).length })}</div>`;
}
function weekChart() {
  const v = [90, S.done ? 55 : 0, 0, 0, 0, 0, 0], last = [90, 62, 85, 60, 58, 70, 64];
  return `<svg class="wkc" viewBox="0 0 300 90">${t('days1').map((d, i) => { const x = 10 + i * 41, h1 = last[i] / 100 * 70, h0 = v[i] / 100 * 70; return `<rect x="${x}" y="${78 - h1}" width="14" height="${h1}" rx="4" fill="rgba(255,255,255,.14)"/><rect class="b" style="transform-origin:${x + 22}px 78px" x="${x + 16}" y="${78 - h0}" width="14" height="${h0}" rx="4" fill="${i === 1 ? 'var(--ember)' : '#fff'}"/>${i === 1 && !S.done ? `<rect x="${x + 16}" y="${78 - 55 / 100 * 70}" width="14" height="${55 / 100 * 70}" rx="4" fill="none" stroke="var(--ember)" stroke-dasharray="3 3"/>` : ''}<text x="${x + 15}" y="89" font-size="9" fill="rgba(255,255,255,.5)" text-anchor="middle" style="font-family:var(--sans)">${d}</text>`; }).join('')}</svg><div class="mkey"><span><i style="background:rgba(255,255,255,.3);box-shadow:none;border-radius:.2rem"></i>${t('lastWk')}</span><span><i style="background:#fff;box-shadow:none;border-radius:.2rem"></i>${t('thisWk')}</span></div>`;
}
function applyProp(n, btn) {
  if (btn.disabled) return; buzz(10); btn.disabled = true;
  const lb = btn.querySelector('.lb');
  go(lb, [{ filter: 'blur(0)', opacity: 1 }, { filter: 'blur(4px)', opacity: 0 }], { key: 'lb', dur: 140 }).finished.then(() => {
    lb.textContent = '✓ ' + (n === 1 ? t('appliedP') : n === 2 ? '+31 g' : t('bedSetS')); go(lb, [{ filter: 'blur(4px)', opacity: 0 }, { filter: 'blur(0)', opacity: 1 }], { key: 'lb', dur: 200 });
  });
  if (n === 1) {
    if (W && !S.done && !canTrimLive()) { toast(t('trimLate')); return; } // already past the cut: this Push stays whole
    S.trimmed = true; built.train = false; paintCards();
    if (W && !S.done) { trimLive(); toast(t('appliedP')); } // one plan: the cards and the running workout change together
    else toast(t('appliedP'), () => { S.trimmed = false; built.train = false; paintCards(); });
  }
  if (n === 2) { const id = addFood(31, 430, 56, 6, 'Skyr + oats'); toast('+31 g', () => removeFood(id)); }
  if (n === 3) toast(t('bedSet'), () => { btn.disabled = false; btn.querySelector('.lb').textContent = t('setIt'); });
}

/* ---------- sheets that grow out of what you touched ---------- */
let sheetOpen = null;
function rectInsetIn(el, box, rad) { const r = el.getBoundingClientRect(), b = box.getBoundingClientRect(), u = remPx(); return `inset(${((r.top - b.top) / u).toFixed(2)}rem ${((b.right - r.right) / u).toFixed(2)}rem ${((b.bottom - r.bottom) / u).toFixed(2)}rem ${((r.left - b.left) / u).toFixed(2)}rem round ${rad}rem)`; }
function openSheet(id, from, build) {
  if (sheetOpen) closeSheet(true);
  const sh = $('#' + id); build && build(); sh.classList.add('on'); $('#scrim').classList.add('on'); phone.classList.add('sheetOn'); sheetOpen = { sh, from }; buzz(6);
  go(sh, [{ clipPath: rectInsetIn(from, sh, 2.4) }, { clipPath: 'inset(0rem 0rem 0rem 0rem round 3.6rem)' }], { pseudo: '::before', key: 'clip' });
  go(sh.firstElementChild, [{ opacity: 0, transform: 'translate3d(0,1.4rem,0)' }, { opacity: 1, transform: 'none' }], { key: 'in', delay: 60 });
}
function closeSheet(instant) {
  if (!sheetOpen) return; const { sh, from } = sheetOpen; sheetOpen = null; sh.classList.remove('on'); $('#scrim').classList.remove('on'); phone.classList.remove('sheetOn');
  go(sh, [{ clipPath: 'inset(0rem 0rem 0rem 0rem round 3.6rem)' }, { clipPath: rectInsetIn(from, sh, 2.4) }], { pseudo: '::before', key: 'clip', dur: instant ? 1 : undefined }).finished.then(x => x.cancel()).catch(() => {});
  go(sh.firstElementChild, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(0,1.4rem,0)' }], { key: 'in', dur: instant ? 1 : 180 });
}
$('#scrim').addEventListener('click', () => { closeSheet(); closeSess(); });
// settings read like the phone's own: grouped rows, values on the right, switches that move on the shared spring
const IC = {
  lang: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5s1.2-6.2 3.6-8.5z"/>',
  units: '<path d="M5 19h14M7.5 19l2-11h5l2 11M12 8V5"/><circle cx="12" cy="4" r="1"/>',
  place: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  rest: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.3 1.6M9.5 3h5"/>',
  hap: '<path d="M8 6v12M12 3v18M16 6v12M4 10v4M20 10v4"/>',
  replay: '<path d="M4 12a8 8 0 108-8 8.2 8.2 0 00-5.7 2.3L4 8.5"/><path d="M4 3.5v5h5"/>'
};
const SKY = { live: '', clear: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>', cloudy: '<path d="M7 18a4.5 4.5 0 01.6-9 5.5 5.5 0 0110.6 1.8A3.8 3.8 0 0118 18z"/>', fog: '<path d="M7.5 13a4 4 0 01.4-7.9 5 5 0 019.5 1.6A3.3 3.3 0 0117 13z"/><path d="M5 16.5h14M7 20h10"/>', rain: '<path d="M7 15.5a4 4 0 01.5-8 5 5 0 019.6 1.5A3.5 3.5 0 0117 16H7.5"/><path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2"/>' };
const ico = k => `<span class="ic"><svg viewBox="0 0 24 24">${IC[k]}</svg></span>`;
function buildSettings() {
  $('#setIn').innerHTML = `<h4>${t('setH')}<button class="circ close" data-close aria-label="Close" style="background:rgba(255,255,255,.1);width:4.6rem;height:4.6rem"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></h4>
    <div class="grp"><div class="srow">${ico('lang')}<div class="tx">${t('lang')}</div><div class="seg sm"><button data-l="en" class="${LANG === 'en' ? 'on' : ''}">English</button><button data-l="da" class="${LANG === 'da' ? 'on' : ''}">Dansk</button></div></div>
      <div class="srow">${ico('units')}<div class="tx">${t('units')}</div><span class="vl">${t('metric')}</span></div></div>
    <div class="gk">${t('windowG')}</div>
    <div class="grp"><div class="srow">${ico('place')}<div class="tx">${t('cph')}<small>${t('placeS')}</small></div></div>
      <div class="srow"><div class="tx">${t('win')}</div><div class="skies">${Object.keys(SKY).map(k => `<button data-w="${k}" class="${WXMODE === k ? 'on' : ''}" aria-label="${k === 'live' ? t('live') : t(k)}">${k === 'live' ? `<span class="lvt">${t('live')}</span>` : `<svg viewBox="0 0 24 24">${SKY[k]}</svg>`}</button>`).join('')}</div></div></div>
    ${DEV || HAPTIC ? `<div class="gk">${t('workoutG')}</div><div class="grp">${DEV ? `<button class="srow" data-sw="short">${ico('rest')}<div class="tx">${t('shortR')}<small>${t('shortS')}</small></div><span class="sw ${SHORT ? 'on' : ''}"></span></button>` : ''}
      ${HAPTIC ? `<button class="srow" data-sw="hap">${ico('hap')}<div class="tx">${t('hap')}</div><span class="sw ${HAPON ? 'on' : ''}"></span></button>` : ''}</div>` : ''}
    <div class="grp" style="margin-top:2.2rem"><button class="srow" id="replay">${ico('replay')}<div class="tx">${t('replay')}</div><svg class="chev" viewBox="0 0 8 13"><path d="M1.5 1.5l5 5-5 5"/></svg></button></div>
    <div class="note">${t('credit')}</div><div class="note" style="margin-top:.8rem">Aven 2 · ${t('preview')}</div>`;
}
$('#setS').addEventListener('click', e => {
  if (e.target.closest('[data-close]')) return closeSheet();
  const l = e.target.closest('[data-l]'), w = e.target.closest('[data-w]'), sw = e.target.closest('[data-sw]');
  if (l) { if (l.dataset.l === LANG) return; buzz(4); LANG = l.dataset.l; store.set('lang', LANG); relabel(); buildSettings(); }
  if (w) { buzz(4); WXMODE = w.dataset.w; $$('#setS [data-w]').forEach(x => x.classList.toggle('on', x === w)); lastAcc = ''; applyLight(nowMin()); paintWx(nowMin()); paintHero(nowMin()); }
  if (sw) {
    const k = sw.dataset.sw, on = !sw.querySelector('.sw').classList.contains('on'); sw.querySelector('.sw').classList.toggle('on', on);
    if (k === 'short') { SHORT = on; store.set('short', on ? '1' : '0'); }
    if (k === 'hap') { HAPON = on; store.set('hap', on ? '1' : '0'); }
    buzz(6);
  }
  if (e.target.closest('#replay')) { closeSheet(); setTimeout(morning, SP.dur); }
});
function relabel() {
  $$('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  readyW = ''; $('#arcHint').textContent = t('arcHint'); paintCards(); paintCta(); $('#coach').__h = null; paintHero(nowMin()); paintWx(nowMin());
  built = {}; ['train', 'fuel', 'health', 'coach'].forEach(k => { if (S.tab === k) { BUILD[k](); built[k] = true; } });
  if (W) renderSet(true);
}

/* ---------- toast with Undo ---------- */
let toastTm, undoFn = null;
function toast(s, u) { $('#toastT').textContent = s; $('#toastU').textContent = t('undo'); undoFn = u || null; $('#toastU').style.display = u ? '' : 'none'; $('#toast').classList.toggle('solo', !u); $('#toast').classList.add('on'); clearTimeout(toastTm); toastTm = setTimeout(() => $('#toast').classList.remove('on'), 3600); }
$('#toastU').addEventListener('click', () => { const f = undoFn; undoFn = null; $('#toast').classList.remove('on'); f && f(); });

/* ================= the workout, inside the same window ================= */
const DEV = Q.get('rest') !== null || Q.get('dev') !== null; // test-only switches show only in test mode
let W = null, SHORT = Q.get('rest') !== null || store.get('short') === '1';
const restSec = s => SHORT ? 10 : s;
/* ---------- saving: the screen keeps its own fast state; the engine keeps the workout (src/app/store.ts) ---------- */
const EXID = { 'Bench press': 'bench-press', 'Incline dumbbell press': 'incline-db-press', 'Overhead press': 'overhead-press', 'Lateral raise': 'lateral-raise', 'Triceps pushdown': 'tricep-pushdown' };
const saveRest = () => store.set('rest', W && W.rest && SAVER && SAVER.id ? JSON.stringify({ sid: SAVER.id, end: W.rest.end, total: W.rest.total, newEx: !!W.rest.newEx }) : ''); // a rest that survives the app being closed
let SAVER = null, warned = false, foodDay = new Date().toDateString();
const pendingFood = []; // foods tapped before the database was ready
const saveFood = t => { if (SAVER) SAVER.addFood(t); else pendingFood.push({ t, at: Date.now() }); };
const unsaveFood = id => { const q = pendingFood.findIndex(y => y.t.id === id); if (q >= 0) pendingFood.splice(q, 1); else if (SAVER) SAVER.removeFood(id); };
const mealSaved = {}; // a planned meal the person ticked early -> its saved note (the meal's own numbers are counted by the plan, so the note holds none)
const snapW = () => ({ name: 'Push', lifts: W.ex.map((e, ei) => ({ exerciseId: EXID[e.n], restSec: e.rest, sets: e.sets.map((s, j) => { const d = W.done[ei][j]; return { kg: d ? d[0] : s[0], reps: d ? d[1] : s[1], done: !!d }; }) })) });
function persist(label) { // called after every change to the workout; the first call starts the saved session
  if (!SAVER || !W || W.saved) return;
  if (!SAVER.id) { SAVER.begin(snapW()); keepWhenUseful(SAVER.engine).catch(() => {}); }
  SAVER.sync(snapW(), label);
}
// past midnight the food totals start over (an app left open overnight must not carry yesterday into today)
function rollDay() {
  const d = new Date().toDateString(); if (d === foodDay) return; foodDay = d;
  Object.assign(FUEL, { extra: 0, extraK: 0, extraC: 0, extraF: 0, log: [] }); FUEL.manual.clear(); Object.keys(mealSaved).forEach(k => delete mealSaved[k]);
  if (SAVER) restoreFoods(); afterFood();
}
function saveFailed() { if (warned) return; warned = true; toast(t('noSave')); }
// today's foods come back after a reload (the totals, the list and the Coach line all start from them)
function restoreFoods() {
  pendingFood.splice(0).forEach(y => SAVER.addFood(y.t, y.at)); // taps from before the database opened are saved now, at the time they were tapped
  restoring = true;
  try { SAVER.foods().forEach(x => { if (x.name.startsWith('meal:')) { FUEL.manual.add(x.name.slice(5)); mealSaved[x.name.slice(5)] = x.id; } else if (!FUEL.log.some(y => y.eid === x.id)) { addFood(x.p, x.k, x.c, x.f, x.name, 0, x.id); FUEL.log[FUEL.log.length - 1].m = cphMin(new Date(x.at)); } }); } finally { restoring = false; }
  afterFood(); // the cards were painted before the database opened
}
// a workout the phone still holds as open (the app was closed or killed mid-workout) comes back as the live pill
function resumeDraft() {
  if (W) return; // a workout started before the database was ready is a new one: never bind it to an older draft
  const d = SAVER.draft();
  if (!d) return;
  const ex = d.snap.lifts.map(l => { const base = PUSH.find(p => EXID[p.n] === l.exerciseId); return base && { ...base, sets: l.sets.map(s => [s.kg, s.reps]) }; });
  if (ex.some(x => !x)) { SAVER.id = null; return; } // a lift this screen does not know: leave it open in the engine, never guess
  const done = d.snap.lifts.map(l => { const a = []; for (const s of l.sets) { if (!s.done) break; a.push([s.kg, s.reps]); } return a; });
  const flags = []; done.forEach((dn, i) => dn.forEach((_, j) => { flags[ex.slice(0, i).reduce((a, x) => a + x.sets.length, 0) + j] = 'd'; }));
  const e = Math.max(0, done.findIndex((dn, i) => dn.length < ex[i].sets.length)), n = done.flat().length;
  const total = ex.reduce((a, x) => a + x.sets.length, 0);
  if (n >= total) { SAVER.closeDraft(d.snap); return; } // everything was logged but the finish never came: close it in the engine, so the next workout starts a new one
  W = { ex, e, s: done[e].length, idx: ex.slice(0, e).reduce((a, x) => a + x.sets.length, 0) + done[e].length, total, done, t0: d.session.startedAt || Date.now(), rest: null, coach: 0, rec: [], vol: done.flat().reduce((a, x) => a + x[0] * x[1], 0), flags };
  S.live = true; buildSess(); renderSet(true); $('#live').classList.add('on'); paintLive(); paintCta();
  try { const r = JSON.parse(store.get('rest') || 'null'); if (r && r.sid === d.session.id && r.end - Date.now() > 1500) { startRest(Math.round((r.end - Date.now()) / 1000), r.newEx, true); W.rest.end = r.end; W.rest.total = r.total; paintLive(); } } catch {} // the rest that was running keeps its remaining time
}
function freshW() {
  const ex = plan().map(e => ({ ...e, sets: e.sets.map(x => x.slice()) }));
  return { ex, e: 0, s: 0, idx: 0, total: ex.reduce((a, e) => a + e.sets.length, 0), done: ex.map(() => []), t0: Date.now(), rest: null, coach: 0, rec: [], vol: 0, flags: [] };
}
const cur = () => W.ex[W.e].sets[W.s];
const idxAt = (e, s) => W.ex.slice(0, e).reduce((a, x) => a + x.sets.length, 0) + s; // a set's place on the strip
const wR = new Roller($('#wW')), rR = new Roller($('#wR')), cdR = new Roller($('#rNum'));
const shortName = e => ({ 'Bench press': LANG === 'da' ? 'Bænk' : 'Bench', 'Incline dumbbell press': LANG === 'da' ? 'Skrå' : 'Incline', 'Overhead press': LANG === 'da' ? 'Skulder' : 'OHP', 'Lateral raise': LANG === 'da' ? 'Sideløft' : 'Raise', 'Triceps pushdown': 'Pushdown' })[e.n];
function buildSess() {
  const box = $('#sess'); box.innerHTML = ''; const w = 37, n = W.total; let k = 0;
  W.ex.forEach((e, ei) => {
    e.sets.forEach(() => { const x = (k + .5) / n * (w - 4.8) + ei * 1.2; const el = document.createElement('i'); el.className = 'st'; el.style.left = x + 'rem'; el.dataset.k = k; box.append(el); k++; });
    const first = W.ex.slice(0, ei).reduce((a, x) => a + x.sets.length, 0);
    const lab = document.createElement('span'); lab.className = 'sl'; lab.style.left = ((first + e.sets.length / 2) / n * (w - 4.8) + ei * 1.2) + 'rem'; lab.textContent = shortName(e); box.append(lab);
  });
  paintSess();
}
function paintSess() {
  $$('#sess .st').forEach(el => { const k = +el.dataset.k; el.classList.toggle('done', !!W.flags[k]); el.classList.toggle('gold', W.flags[k] === 'g'); el.classList.toggle('cur', k === W.idx && S.view !== 'complete'); });
  $('#sessN').textContent = Math.min(W.idx + 1, W.total); $('#sessOf').textContent = `/ ${W.total}`;
}
/* ---------- the stage: the Workout build's 3D equipment behind the workout ----------
   stage.js (three.js) loads after the first screen is up and builds the bar, the dumbbells and the cable stack once, while
   nobody is looking; until it is ready the workout shows its numbers on the photo. It renders only when something changes. */
const STG = { s: null, kind: null, ex: -1, kg: null, rest: false, chain: Promise.resolve() };
const KIND3 = { bar: 'barbell', db: 'dumbbells', cable: 'cable' };
const MOOD = { train: { field: '#2c0f09', halo: '#5e1c0d' }, rest: { field: '#05282b', halo: '#0c4d4a' } };
const stageDo = f => { STG.chain = STG.chain.then(f).catch(() => {}); return STG.chain; }; // one change at a time, in order
let lastTouch = 0; ['pointerdown', 'click', 'keydown', 'wheel'].forEach(e => addEventListener(e, () => { lastTouch = performance.now(); }, { capture: true, passive: true }));
function loadStage() {
  if (!window.WebGL2RenderingContext || Q.get('nostage') !== null) return;
  import('./stage.js').then(initStage, e => console.warn('stage', e));
}
async function initStage(mod) {
  try {
    // each heavy step (the studio light, each kind of equipment, the first big draw) waits until nobody has touched the
    // screen for a moment, so building the 3D never lands on a tap or a scroll
    const calm = () => STG.s ? Promise.resolve() : new Promise(r => { const k = () => performance.now() - lastTouch > 1200 ? r() : setTimeout(k, 200); k(); });
    const s = await mod.createStage($('#stg'), { calm });
    frameStage(s);
    // every kind of equipment is built once and every kind of change plays once, while the canvas is still hidden,
    // so the first real lift change, plate change, rest and record never pay for building meshes or compiling shaders
    for (const [k, kg] of [['cable', 25], ['dumbbells', 12], ['barbell', 80]]) await s.show(k, kg, MOOD.train);
    await calm(); await s.load(20); await s.load(82.5); await s.show('dumbbells', 12, null, { fade: true }); await s.show('barbell', 80, null, { fade: true });
    await Promise.all([s.focus(1, 1), s.tint(MOOD.rest, 1)]); await Promise.all([s.focus(0, 1), s.tint(MOOD.train, 1)]);
    STG.s = s; STG.kind = 'barbell'; STG.ex = -1; STG.kg = 80; STG.rest = false;
    if (W) { syncStage(true); if (W.rest) moodStage(true); }
    requestAnimationFrame(() => $('#stg').classList.add('ready'));
  } catch (e) { console.warn('stage', e); }
}
function frameStage(s = STG.s) { // the room is everything between the header and the words; the lens's sharp edge sits at its foot
  if (!s) return; const ph = phone.getBoundingClientRect(), hd = $('#wHd').getBoundingClientRect(), mid = $('#wMid').getBoundingClientRect();
  const top = hd.bottom - ph.top + remPx() * 2.4, bottom = Math.max(top + 120, mid.top - ph.top - remPx() * 1.6);
  // a little smaller than the Workout build's framing: the equipment sits whole inside its room, with dark around it, and
  // never runs behind the header's glass
  s.frame({ top, bottom, H: ph.height, scale: .7 }); s.look({ focusY: clamp(1 - bottom / ph.height + .1, .45, .84) });
}
function syncStage(instant) {
  const s = STG.s; if (!s || !W) return; const E = W.ex[W.e], kind = KIND3[kitOf(E)[0]], kg = cur()[0];
  if (STG.ex !== W.e) { STG.ex = W.e; STG.kind = kind; STG.kg = kg; stageDo(() => s.show(kind, kg, null, { fade: !instant })); }
  else if (kg !== STG.kg) { STG.kg = kg; stageDo(() => STG.kg === kg ? s.load(kg) : null); } // quick changes collapse into the latest
}
function moodStage(rest) { // rest: the lens lets go of the bar and the room turns teal; a set: it finds the bar again, warm
  const s = STG.s; if (!s || STG.rest === rest) return; STG.rest = rest;
  s.focus(rest ? 1 : 0, rest ? 900 : 650); s.tint(rest ? MOOD.rest : MOOD.train, rest ? 900 : 650);
}
addEventListener('resize', () => frameStage());
function fitNum() { // one line always: a long weight or two-digit reps shrink the line a little instead of wrapping
  const b = $('#setB'), row = b.firstElementChild; b.style.setProperty('--nf', '9.6rem');
  const k = b.clientWidth / Math.max(1, row.scrollWidth); if (k < 1) b.style.setProperty('--nf', (9.6 * k * .97).toFixed(2) + 'rem');
}
function renderSet(instant) {
  const E = W.ex[W.e], s = cur();
  $('#exName').textContent = exN(E);
  $('#exSub').textContent = t('set', { a: W.s + 1, b: E.sets.length });
  wR.set(kgFmt(s[0]), { instant }); rR.set(String(s[1]), { instant });
  $('#wCoach').textContent = setLine(E, s);
  $('#wMeta').innerHTML = `<span>${t('last')} <b>${kgFmt(E.last[0])} × ${E.last[1]}</b></span><span>${t('best')} <b>${kgFmt(E.best[0])} × ${E.best[1]}</b></span>`;
  const nx = nextOf(W.e, W.s), nE = W.ex[W.e + 1];
  $('#wNext').innerHTML = nx ? `${t('next')} <b class="tab">${kgFmt(nx.s[0])} × ${nx.s[1]}</b>${nx.e !== W.e ? ' · ' + exN(W.ex[nx.e]) : nE ? ` · ${t('thenEx')} ${exN(nE)}` : ''}` : t('lastEx');
  $('#logL').textContent = W.end ? t('finishP') : t('logSet', { w: kgFmt(s[0]), r: s[1] });
  paintSess(); paintLive(); fitNum(); syncStage(instant);
}
// the next set not yet logged, after this one and wrapping round once, so a lift done out of order is never logged twice
function nextOf(e, s) {
  const pos = []; W.ex.forEach((x, ei) => x.sets.forEach((_, si) => pos.push([ei, si])));
  const at = pos.findIndex(p => p[0] === e && p[1] === s);
  for (let k = 1; k < pos.length; k++) { const [ei, si] = pos[(at + k) % pos.length]; if (!W.done[ei][si]) return { e: ei, si, s: W.ex[ei].sets[si] }; }
  return null;
}
let clkTm = 0;
function tickClock() { if (!W) return; const s = Math.floor((Date.now() - W.t0) / 1000), tx = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; $('#clkT').textContent = tx; $('#liveC').textContent = tx; }
function paintLive() { if (!W) return; $('#liveT').innerHTML = W.rest ? `${t('liveR', { ex: exN(W.ex[W.e]) })}<small>${t('nextSet')} · ${kgFmt(cur()[0])} × ${cur()[1]}</small>` : `${t('liveT', { ex: exN(W.ex[W.e]) })}<small>${t('liveS', { a: W.idx + 1, b: W.total })}</small>`; }
function setView(v) { S.view = v; lastTouch = performance.now(); phone.dataset.v = v === 'complete' ? 'done' : v === 'record' ? 'rest' : v; }
function fades(on, sel = '#wNameW,#setB,#wCoach,#wMeta,#wNext') { $$(sel).forEach((el, i) => { el.style.transitionDelay = on ? (90 + i * 45) + 'ms' : '0ms'; el.classList.toggle('in', on); }); }
function restFades(on) { $$('#rLabel,#rNum,#rNext').forEach((el, i) => { el.style.transitionDelay = on ? (120 + i * 50) + 'ms' : '0ms'; el.classList.toggle('in', on); }); }
function startWorkout() {
  if (S.view !== 'today') return;
  if (S.done) return show('fuel');
  closeSheet();
  if (!W) { W = freshW(); buildSess(); renderSet(true); persist('Started Push'); }
  S.live = true; buzz(12); S.prevTab = S.tab; frameStage();
  // the active screen's glass slides away; the photo pushes in and the workout rises inside it
  const scr = $(`.scr[data-s="${S.tab}"]`);
  scr.classList.add('out');
  scr.querySelectorAll('.hdr').forEach(el => go(el, [{ transform: 'none' }, { transform: 'translate3d(0,-12rem,0)' }], { key: 'scr', keep: true })); // glass only ever moves
  setView(W.rest ? 'rest' : 'train');
  pushTo(1, 760); fades(true); if (W.rest) restFades(true);
  $$('#sess .st').forEach((el, i) => el.animate([{ transform: 'scaleY(0)' }, { transform: 'none' }], { duration: SP.dur, easing: SP.easing, delay: 200 + i * 18, fill: 'backwards' }));
  if (!clkTm) clkTm = setInterval(tickClock, 1000); tickClock();
  $('#live').classList.remove('on');
}
let pushAnim = 0;
// the shared spring as a function of progress, for the few motions JS drives itself (the photo push, the morning sweep),
// stretched to their own length so they glide and settle once, like everything else
const SPP = SP.easing.slice(7, -1).split(',').map(s => s.trim().split(' ')).map(([y, p]) => [parseFloat(p) / 100, +y]);
const springAt = k => { let i = 1; while (i < SPP.length - 1 && SPP[i][0] < k) i++; const [x0, y0] = SPP[i - 1], [x1, y1] = SPP[i]; return y0 + (y1 - y0) * ((k - x0) / Math.max(1e-6, x1 - x0)); };
function pushTo(v, ms) { // the photo pushes in: near ridges grow faster than far ones
  const from = scene.push, t0 = performance.now(), id = ++pushAnim;
  const st = () => { if (id !== pushAnim) return; const k = clamp((performance.now() - t0) / ms, 0, 1); scene.push = lerp(from, v, springAt(k)); render(); if (k < 1) requestAnimationFrame(st); };
  requestAnimationFrame(st);
}
function backIn() { // the screen you came from comes back
  const scr = $(`.scr[data-s="${S.tab}"]`);
  scr.classList.remove('out');
  scr.querySelectorAll('.hdr').forEach(el => go(el, [{ transform: 'translate3d(0,-12rem,0)' }, { transform: 'none' }], { key: 'scr', delay: 80, drop: true }));
}
function minimise() {
  if (S.view === 'record' || S.view === 'complete') return;
  closeSess(); closeSheet(true); setView('today'); fades(false); restFades(false); pushTo(0, 600); backIn(); paintCta(); paintHero(nowMin()); $('#live').classList.add('on'); paintLive();
  if (S.tab === 'train') { built.train = false; BUILD.train(); built.train = true; }
}
$('#minB').addEventListener('click', minimise);
$('#live').addEventListener('click', startWorkout);
/* the Coach's line changes with every set: a cue on the first, what the last set showed in the middle, a push on the last */
function setLine(E, s) {
  const last = W.done[W.e].filter(Boolean), p = last.length, prev = last[p - 1], ei = PUSH.findIndex(x => x.n === E.n);
  if (W.coach === 2 && W.e === 0 && W.s >= 2) return LANG === 'da' ? 'Coach satte 85 kg. Du kan godt.' : 'Coach set 85 kg. You have this.';
  if (s[0] > E.best[0] || (s[0] >= E.best[0] && s[1] > E.best[1])) return t('sRecTry', { w: kgFmt(s[0]), r: s[1] });
  if (!p) return t('trCoach')[ei];
  if (W.s === E.sets.length - 1) return t('sLast', { ex: exN(E).toLowerCase() });
  return prev && prev[1] < E.sets[p - 1][1] ? t('sGrind', { p }) : t('sMid', { p });
}

/* the whole number is one big button: a tap opens the set sheet; a sideways drag nudges the weight one plate step per 4.4 rem */
(() => {
  const b = $('#setB'); let d = null;
  b.addEventListener('pointerdown', e => { if (S.view !== 'train' || !W || W.end) return; d = { x: e.clientX, y: e.clientY, k: 0, moved: false, id: e.pointerId }; });
  b.addEventListener('pointermove', e => {
    if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved) { if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { d.moved = true; try { b.setPointerCapture(d.id); } catch {} } else if (Math.abs(dy) > 10) { d = null; return; } else return; }
    const step = 4.4 * remPx(), k = Math.trunc(dx / step);
    if (k !== d.k) { nudge(k - d.k); d.k = k; }
  });
  const up = () => { if (d && !d.moved && S.view === 'train') openEdit(); d = null; };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', () => { d = null; });
  b.addEventListener('keydown', e => { if (e.key === 'ArrowRight') nudge(1); if (e.key === 'ArrowLeft') nudge(-1); if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(); } });
})();
function nudge(n) { // one plate step at a time, never below what can be loaded
  if (!W || W.end || S.view !== 'train') return; const s = cur(), [kind, st] = kitOf(W.ex[W.e]), lo = kind === 'bar' ? 20 : st;
  const w = Math.max(lo, +(s[0] + n * st).toFixed(2)); if (w === s[0]) return;
  s[0] = w; wR.set(kgFmt(w), { dir: n > 0 ? 1 : -1 }); buzz(5); fitNum(); syncStage();
  $('#logL').textContent = t('logSet', { w: kgFmt(w), r: s[1] }); $('#wCoach').textContent = setLine(W.ex[W.e], s);
}
/* the set sheet: drag the dial and the plates change with it; reps are two big buttons */
const PCOL = { 25: '#b3121c', 20: '#1c4fb0', 15: '#d9a417', 10: '#1f8a49', 5: '#e9e6de', 2.5: '#1a1a1c', 1.25: '#b9bdc4' };
const PH = { 25: 9, 20: 9, 15: 8, 10: 6.6, 5: 4.6, 2.5: 3.8, 1.25: 3.2 };
function platesFor(kg) { let side = Math.max(0, (kg - 20) / 2); const o = []; for (const p of [25, 20, 15, 10, 5, 2.5, 1.25]) while (side >= p - 1e-6) { o.push(p); side -= p; } return o; }
function paintPlates(kg) {
  const E = W.ex[W.e], [kind] = kitOf(E), box = $('#edP'), note = $('#edN'); if (!box) return;
  if (kind === 'bar') {
    const p = platesFor(kg), W_ = { 25: 1.9, 20: 1.7, 15: 1.5, 10: 1.4, 5: 1.1, 2.5: .9, 1.25: .7 }, plate = x => `<i style="height:${PH[x]}rem;width:${W_[x]}rem;--c:${PCOL[x]}"></i>`;
    // the bar seen from the side: the shaft in the middle, a collar each side, then the plates outward, biggest first
    box.innerHTML = '<span class="cap"></span>' + p.slice().reverse().map(plate).join('') + '<span class="col2"></span><span class="shaft"></span><span class="col2"></span>' + p.map(plate).join('') + '<span class="cap"></span>';
    note.textContent = p.length ? t('perSide', { p: p.map(kgFmt).join(' + ') + ' kg' }) : t('justBar');
  } else { box.innerHTML = ''; note.textContent = kind === 'db' ? t('eachDb', { w: kgFmt(kg) }) : t('pinAt', { w: kgFmt(kg) }); }
}
function buildEd() {
  const E = W.ex[W.e], s = cur(), [kind, st] = kitOf(E), lo = kind === 'bar' ? 20 : st, hi = kind === 'bar' ? 200 : kind === 'db' ? 60 : 100, n = Math.round((hi - lo) / st);
  $('#edIn').innerHTML = `<h4>${t('set', { a: W.s + 1, b: E.sets.length })}<button class="circ close" data-close aria-label="Close" style="background:rgba(255,255,255,.1);width:4.6rem;height:4.6rem"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></h4>
    <div class="ed-k">${t('edK')} · ${exN(E)}</div><div class="ed-v tab"><b id="edW">${kgFmt(s[0])}</b><span>kg</span></div>
    <div class="dial" id="edD" role="slider" tabindex="0" aria-label="${t('edK')}" aria-valuemin="${lo}" aria-valuemax="${hi}" aria-valuenow="${s[0]}"><div class="tk" id="edT">${Array.from({ length: n + 1 }, (_, i) => `<i class="${Math.abs((lo + i * st) % 10) < 1e-6 ? 'mj' : ''}" style="left:${-i * 2.4}rem"></i>`).join('')}</div><div class="nd"></div></div>
    <div class="plates" id="edP" aria-hidden="true"></div><div class="ed-n" id="edN"></div>
    <div class="ed-k">${t('edR')}</div><div class="ed-r"><button data-er="-1" aria-label="−1">−</button><b class="tab" id="edRv">${s[1]}</b><button data-er="1" aria-label="+1">+</button></div>
    <button class="ed-done" data-close>${t('edDone')}</button>`;
  paintPlates(s[0]);
  // the dial runs the same way as the big number: drag right for heavier. Lighter ticks sit to the right, so they slide
  // away under the finger as heavier ones arrive from the left
  const D = $('#edD'), T = $('#edT'), PX = 2.4 * remPx(), toX = w => ((w - lo) / st) * PX;
  let x = toX(s[0]), drag = null, anim = 0;
  const place = v => { x = v; T.style.transform = `translate3d(${v}px,0,0)`; const i = clamp(Math.round(v / PX), 0, n), w = +(lo + i * st).toFixed(2);
    if (w !== s[0]) { s[0] = w; $('#edW').textContent = kgFmt(w); D.setAttribute('aria-valuenow', w); wR.set(kgFmt(w), { dir: 1 }); $('#logL').textContent = t('logSet', { w: kgFmt(w), r: s[1] }); paintPlates(w); buzz(3); fitNum();
      clearTimeout(STG.dt); STG.dt = setTimeout(syncStage, 160); } }; // the bar behind the sheet takes the plates once the dial rests
  place(x);
  const band = (o, dd) => (1 - 1 / ((0.55 * Math.abs(o)) / dd + 1)) * dd * Math.sign(o); // iOS rubber band at the ends
  D.addEventListener('pointerdown', e => { cancelAnimationFrame(anim); drag = { x0: e.clientX, from: x, s: [[e.clientX, performance.now()]], on: false, id: e.pointerId }; });
  D.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x0; if (!drag.on) { if (Math.abs(dx) < 6) return; drag.on = true; try { D.setPointerCapture(drag.id); } catch {} }
    const raw = drag.from + dx, max = n * PX, wd = D.offsetWidth; place(raw < 0 ? band(raw, wd) : raw > max ? max + band(raw - max, wd) : raw); drag.s.push([e.clientX, performance.now()]); if (drag.s.length > 8) drag.s.shift(); });
  const end = () => { if (!drag) return; const now = performance.now(), r = drag.s.filter(([, tt]) => now - tt < 80), a = r[0] || drag.s[0], z = drag.s[drag.s.length - 1]; drag = null;
    // a gentle fling: a little momentum, and never more than four plate steps past where the finger let go
    const v = z[1] > a[1] ? (z[0] - a[0]) / (z[1] - a[1]) * 1000 : 0, here = Math.round(x / PX), go4 = clamp(Math.round(v * 0.15 / PX), -4, 4);
    const target = clamp((here + go4) * PX, 0, n * PX), from = x, t0 = performance.now(), ms = SP.dur;
    const st2 = () => { const k = clamp((performance.now() - t0) / ms, 0, 1); place(lerp(from, target, springAt(k))); if (k < 1) anim = requestAnimationFrame(st2); }; anim = requestAnimationFrame(st2); };
  D.addEventListener('pointerup', end); D.addEventListener('pointercancel', end);
  D.addEventListener('keydown', e => { if (e.key === 'ArrowRight') place(clamp(x + PX, 0, n * PX)); if (e.key === 'ArrowLeft') place(clamp(x - PX, 0, n * PX)); });
  $$('#edIn [data-er]').forEach(btn => btn.addEventListener('click', () => { s[1] = clamp(s[1] + +btn.dataset.er, 1, 30); $('#edRv').textContent = s[1]; rR.set(String(s[1]), { dir: +btn.dataset.er }); $('#logL').textContent = t('logSet', { w: kgFmt(s[0]), r: s[1] }); buzz(4); fitNum(); }));
  $$('#edIn [data-close]').forEach(c => c.addEventListener('click', () => { closeSheet(); $('#wCoach').textContent = setLine(W.ex[W.e], cur()); }));
}
function openEdit() { if (!W || W.end || S.view !== 'train') return; openSheet('edS', $('#setB'), buildEd); }
/* moving Push weighs tomorrow's wrestling: two real choices, the recommended one first */
// the arc says where Push went: today's session dims, and its label names the new day
function arcPush() { const l = $('#aLab'); if (!l) return; l.textContent = S.moved ? t('arcMoved', { d: t(S.movedTo === 'tom' ? 'dTom' : 'dThu') }) : `${hm(915)} ${t('push').toUpperCase()}`; ['#aSess', '#aSessG'].forEach(q => { const e = $(q); if (e) e.style.opacity = S.moved ? .3 : ''; }); l.style.opacity = S.moved ? .7 : ''; }
function openMove(from) {
  openSheet('mvS', from, () => {
    $('#mvIn').innerHTML = `<h4>${t('moveK')}<button class="circ close" data-close aria-label="Close" style="background:rgba(255,255,255,.1);width:4.6rem;height:4.6rem"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></h4>
      <p style="margin:0 0 .8rem;font-size:1.5rem;line-height:1.4;color:var(--ink2)">${t('moveWhy')}</p>
      <button class="mv-o rec" data-mv="thu"><em>${t('recommended')}</em><b>${t('optThu')}</b><span>${t('optThuS')}</span></button>
      <button class="mv-o" data-mv="tom"><b>${t('optTom')}</b><span>${t('optTomS')}</span></button>`;
    $$('#mvIn [data-mv]').forEach(o => o.addEventListener('click', () => {
      const to = o.dataset.mv; S.moved = true; S.movedTo = to; closeSheet(); paintCta.k = ''; paintCta(); arcPush(); buzz(10);
      toast(t(to === 'thu' ? 'movedThu' : 'movedTom'), () => { S.moved = false; S.movedTo = null; paintCta.k = ''; paintCta(); arcPush(); });
    }));
    $$('#mvIn [data-close]').forEach(c => c.addEventListener('click', () => closeSheet()));
  });
}$('#logB').addEventListener('click', () => { if (!W) return; if (W.end) return openSess(); if (S.view === 'rest') return endRest(false); if (S.view === 'train') logSet(); });
function pearl() {
  const i = $('#pearl i'), p = $('#pearl svg');
  i.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: SP.dur, easing: SP.easing, fill: 'forwards' });
  p.animate([{ strokeDashoffset: 20 }, { strokeDashoffset: 0 }], { duration: 240, delay: 160, easing: 'cubic-bezier(.3,.8,.3,1)', fill: 'forwards' });
}
function resetPearl() { $('#pearl i').getAnimations().forEach(a => a.cancel()); $('#pearl svg').getAnimations().forEach(a => a.cancel()); }
function tickRect(k) { return $(`#sess .st[data-k="${k}"]`).getBoundingClientRect(); }
function flyInto(el, k, rev) { // the numbers travel into their tick on the session strip (or back out of the next one)
  const r0 = el.getBoundingClientRect(), r1 = tickRect(k);
  const end = `translate3d(${r1.left + r1.width / 2 - r0.left}px,${r1.top + r1.height / 2 - (r0.top + r0.height / 2)}px,0) scale(.06)`;
  return rev ? go(el, [{ transform: end, opacity: 0 }, { transform: 'none', opacity: 1 }], { key: 'fly', drop: true, dur: SP.dur + 80 })
             : go(el, [{ transform: 'none', opacity: 1 }, { transform: end, opacity: 0 }], { key: 'fly', keep: true, dur: SP.dur + 40 });
}
function logSet() {
  if (W.busy || W.end) return; W.busy = true; // a second tap inside the 300 ms hand-off would log the same set twice and skip the next
  const s = cur(), E = W.ex[W.e], k = W.idx;
  buzz(14); pearl(); bloom($('#pearl'), 'rgba(255,170,120,.5)'); closeSheet(true);
  W.done[W.e][W.s] = s.slice(); W.vol += s[0] * s[1]; persist('Set logged');
  const heavy = s[0] > E.best[0], repB = !heavy && s[0] >= E.best[0] && s[1] > E.best[1];
  W.flags[k] = heavy || repB ? 'g' : 'd';
  if (heavy || repB) W.rec.push({ e: W.e, w: s[0], r: s[1], heavy });
  const prev = { e: W.e, s: W.s, idx: W.idx, coach: W.coach, vol: W.vol - s[0] * s[1] };
  setTimeout(() => {
    W.busy = false;
    flyInto($('#setB'), k);
    const nx = nextOf(W.e, W.s);
    if (!nx) { W.idx = W.total; W.end = true; $('#logL').textContent = t('finishP'); paintSess(); setTimeout(openSess, 420); return; } // the last set: Log now means Finish
    W.e = nx.e; W.s = nx.si; W.idx = idxAt(nx.e, nx.si); paintSess();
    if (W.e === 0 && W.s === 2 && W.coach === 0) W.coach = 1;
    const mini = S.view === 'today'; // minimised inside the 300 ms: the workout moves on quietly, the screen stays where the person went
    startRest(E.rest, nx.e !== prev.e, mini);
    if (heavy && !mini) setTimeout(() => record(s, k), 380);
    else if (heavy || repB) toast(`${t('repBest')} · ${exN(E)} ${kgFmt(s[0])} × ${s[1]}`);
    else toast(t('loggedU', { w: kgFmt(s[0]), r: s[1] }), () => undoLog(prev, k));
  }, 300);
}
function undoLog(p, k) {
  if (!W || S.view !== 'rest') return;
  clearRest(); W.e = p.e; W.s = p.s; W.idx = p.idx; W.coach = p.coach; W.vol = p.vol; W.flags[k] = undefined; W.done[p.e].length = p.s; persist('Set undone');
  setView('train'); restFades(false); renderSet(true); resetPearl(); flyInto($('#setB'), k, true); fades(true); moodStage(false);
}
let restTm = 0;
function startRest(sec, newEx, quiet) {
  sec = restSec(sec);
  W.rest = { end: Date.now() + sec * 1000, total: sec * 1000, newEx }; saveRest();
  if (!quiet) setView('rest');
  $$('#wNameW,#wCoach,#wMeta,#wNext').forEach(el => el.classList.remove('in'));
  const nx = cur();
  $('#rLabel').textContent = t('rest');
  paintRestNext();
  cdR.set(fmtS(sec), { instant: true }); restFades(true);
  $('#logL').textContent = t('skip');
  const lv = $('#level'); lv.getAnimations().forEach(a => a.cancel());
  lv.animate([{ transform: 'translate3d(0,100%,0)' }, { transform: 'translate3d(0,0%,0)' }], { duration: sec * 1000, easing: 'linear', fill: 'forwards' });
  clearInterval(restTm); restTm = setInterval(restTick, 250);
  if (W.coach === 1 && !quiet) setTimeout(openTray, 900);
  paintLive(); moodStage(true);
}
const fmtS = s => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;
let lastSec = -1;
function restTick() {
  if (!W || !W.rest) return;
  const left = Math.ceil((W.rest.end - Date.now()) / 1000);
  if (left !== lastSec) { lastSec = left; cdR.set(fmtS(Math.max(0, left)), { dir: -1, dur: 340 }); if (left <= 3 && left > 0) { buzz(8); $('#rNum').animate([{ transform: 'scale(1.04)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.9,.3,1)' }); } }
  if (left <= 0) endRest(true);
}
function clearRest() { clearInterval(restTm); W.rest = null; saveRest(); lastSec = -1; $('#level').getAnimations().forEach(a => a.cancel()); closeTray(); moodStage(false); }
function endRest(auto) {
  if (!W || !W.rest) return; const newEx = W.rest.newEx;
  if (auto) buzz([60, 40, 60]);
  if (S.view !== 'rest') { // minimised, or a record is on screen: the rest ends quietly and the view you are in stays
    clearRest(); resetPearl(); renderSet(true); $('#setB').getAnimations().forEach(a => a.__k === 'fly' && a.cancel());
    if (S.view === 'today') toast(t('restOver', { ex: exN(W.ex[W.e]), a: W.s + 1 }));
    return;
  }
  clearRest(); setView('train'); restFades(false); resetPearl(); renderSet(false);
  if (newEx) go($('#exName'), [{ transform: 'translate3d(6rem,0,0)', opacity: 0 }, { transform: 'none', opacity: 1 }], { key: 'nm' });
  flyInto($('#setB'), W.idx, true); fades(true);
}
$('#m15').addEventListener('click', () => { if (!W || !W.rest) return; W.rest.end -= 15000; saveRest(); buzz(5); retimeLevel(); restTick(); });
$('#p15').addEventListener('click', () => { if (!W || !W.rest) return; W.rest.end += 15000; W.rest.total += 15000; saveRest(); buzz(5); retimeLevel(); restTick(); });
function retimeLevel() { const lv = $('#level'), left = W.rest.end - Date.now(); const y = new DOMMatrix(getComputedStyle(lv).transform).m42 / lv.offsetHeight; lv.getAnimations().forEach(a => a.cancel()); lv.animate([{ transform: `translate3d(0,${(y * 100).toFixed(2)}%,0)` }, { transform: 'translate3d(0,0%,0)' }], { duration: Math.max(200, left), easing: 'linear', fill: 'forwards' }); }
function openTray() {
  if (!W || !W.rest || W.coach !== 1) return; const tr = $('#tray'), inn = $('#trIn');
  inn.innerHTML = `<div class="k">${t('coachK')}</div><p>${t('coachP')}</p><div class="r"><button class="use" id="use85"><span class="lb">${t('use85')}</span></button><button class="keep" id="keepB">${t('keep')}</button></div>`;
  tr.classList.add('on'); buzz(6);
  go(tr, [{ clipPath: 'inset(0 0 100% 0 round 2.6rem)' }, { clipPath: 'inset(0 0 0% 0 round 2.6rem)' }], { pseudo: '::before', key: 'clip' });
  go(inn, [{ opacity: 0, transform: 'translate3d(0,-.8rem,0)' }, { opacity: 1, transform: 'none' }], { key: 'in', delay: 80 });
  $('#use85').addEventListener('click', useCoach); $('#keepB').addEventListener('click', () => { W.coach = 3; closeTray(); });
}
function closeTray() {
  const tr = $('#tray'); if (!tr.classList.contains('on')) return; tr.classList.remove('on');
  go(tr, [{ clipPath: 'inset(0 0 0% 0 round 2.6rem)' }, { clipPath: 'inset(0 0 100% 0 round 2.6rem)' }], { pseudo: '::before', key: 'clip' }).finished.then(x => x.cancel()).catch(() => {});
  go($('#trIn'), [{ opacity: 1 }, { opacity: 0 }], { key: 'in', dur: 160 });
}
function useCoach() {
  if (W.coach !== 1) return; W.coach = 2; buzz(10);
  const rest = W.ex[0].sets.slice(2), prev = rest.map(x => x[0]); // only the sets that exist (the 30-minute plan keeps three)
  rest.forEach(x => x[0] = 85); persist('Coach: 85 kg');
  const lb = $('#use85 .lb');
  go(lb, [{ filter: 'blur(0)', opacity: 1 }, { filter: 'blur(4px)', opacity: 0 }], { key: 'lb', dur: 140 }).finished.then(() => { lb.textContent = '✓ ' + t('applied'); go(lb, [{ filter: 'blur(4px)', opacity: 0 }, { filter: 'blur(0)', opacity: 1 }], { key: 'lb', dur: 200 }); });
  $('#rNext b').textContent = `${kgFmt(85)} × 8`;
  setTimeout(closeTray, 1300);
  toast(t('applied'), () => { rest.forEach((x, i) => x[0] = prev[i]); W.coach = 3; persist('Coach: back to the plan'); if (W.rest) $('#rNext b').textContent = `${kgFmt(prev[0])} × 8`; else renderSet(); });
}
// the 30-minute plan on a running workout: drop the cut lifts and sets, keep every logged set and its place on the strip
const canTrimLive = () => W.e < 3 && (W.s < 3 || W.e < 2) && !W.done.slice(plan().length).some(d => d.some(Boolean)); // never drop a lift that already has logged sets
function trimLive() {
  const P = plan(), keep = P.map((e, i) => Math.max(e.sets.length, W.done[i] ? W.done[i].filter(Boolean).length : 0)), start = ex => ex.map((_, i) => ex.slice(0, i).reduce((a, x) => a + x.sets.length, 0));
  const o = start(W.ex), nex = W.ex.slice(0, P.length).map((e, i) => ({ ...e, sets: e.sets.slice(0, keep[i]) })), n = start(nex), flags = [];
  nex.forEach((e, i) => e.sets.forEach((_, s) => { flags[n[i] + s] = W.flags[o[i] + s]; }));
  if (W.s >= keep[W.e]) { W.e++; W.s = 0; }
  W.ex = nex; W.done = W.done.slice(0, nex.length).map((d, i) => d.slice(0, keep[i])); W.flags = flags; W.rec = W.rec.filter(r => r.e < nex.length);
  W.total = nex.reduce((a, e) => a + e.sets.length, 0); W.idx = n[W.e] + W.s;
  const slots = []; W.ex.forEach((x, ei) => x.sets.forEach((_, si) => slots.push([ei, si])));
  const at = Math.max(0, slots.findIndex(q => q[0] === W.e && q[1] === W.s)), dest = slots.map((_, k) => slots[(at + k) % slots.length]).find(q => !W.done[q[0]][q[1]]);
  if (dest) { W.e = dest[0]; W.s = dest[1]; W.idx = idxAt(dest[0], dest[1]); } else { W.end = true; W.e = W.ex.length - 1; W.s = W.ex[W.e].sets.length - 1; W.idx = W.total; $('#logL').textContent = t('finishP'); } // every kept set is already logged: Log now means Finish
  buildSess(); renderSet(true); if (W.rest) paintRestNext(); paintLive(); persist('Plan trimmed');
}
function paintRestNext() { const nx = cur(); $('#rNext').innerHTML = `${t('nextSet')} · <b class="tab">${kgFmt(nx[0])} × ${nx[1]}</b><small>${exN(W.ex[W.e])} · ${t('set', { a: W.s + 1, b: W.ex[W.e].sets.length })}</small>`; }
function record(s, k) { // a record grows from the logged set into a lit medal on black, then lands on the strip
  setView('record'); buzz([20, 60, 20, 60, 40]); phone.classList.add('recOn');
  $('#rec').style.pointerEvents = 'auto';
  $('#mdW').innerHTML = `${kgFmt(s[0])}<small>kg</small>`; $('#mdR').textContent = t('recCoin');
  { const E = W.ex[W.rec[W.rec.length - 1].e], v = E.hist.slice(-5).concat([s[0]]), mn = Math.min(...v) - 2, mx = Math.max(...v) + 3, X = i => 8 + i / (v.length - 1) * 284, Y = x => 72 - (x - mn) / (mx - mn) * 62, yb = Y(E.best[0]).toFixed(1);
    $('#recL').innerHTML = `<svg viewBox="0 0 300 84"><line x1="8" x2="292" y1="${yb}" y2="${yb}" stroke="rgba(255,236,200,.5)" stroke-dasharray="4 6"/><text x="8" y="${(+yb - 6).toFixed(1)}" font-size="10" fill="rgba(255,236,200,.7)" style="font-family:var(--sans)">${t('oldBest')} ${kgFmt(E.best[0])}</text><path d="${v.map((x, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x).toFixed(1)).join('')}" fill="none" stroke="#ffd98f" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(v.length - 1).toFixed(1)}" cy="${Y(s[0]).toFixed(1)}" r="5" fill="#fff6dc"/></svg>`;
    $('#recL svg').animate([{ clipPath: 'inset(-20% 100% -20% 0)' }, { clipPath: 'inset(-20% 0% -20% 0)' }], { duration: RM ? 1 : 900, delay: 420, easing: 'cubic-bezier(.45,.05,.2,1)', fill: 'backwards' }); } // the line climbs past the old best
  $('#recT').innerHTML = `<div class="k">${t('recK')}</div><h2>${kgFmt(s[0])} kg × ${s[1]}</h2><p>${t('recP')}</p>`; if (!$('#rec .rcont')) { const b = document.createElement('button'); b.className = 'rcont'; $('#rec').append(b); } $('#rec .rcont').textContent = t('continue');
  $('#mdD').textContent = new Date().toLocaleDateString(LANG === 'da' ? 'da-DK' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
  // the gold room is fully up before the coin arrives, so nothing of the rest screen shows through behind it
  go($('#recBg'), [{ opacity: 0 }, { opacity: 1 }], { key: 'o', dur: 280, easing: 'ease', keep: true });
  const m = $('#medal'), D0 = RM ? 0 : 300;
  go(m, [{ transform: 'translate3d(0,2rem,0) scale(.92)', opacity: 0 }, { transform: 'none', opacity: 1 }], { key: 'm', keep: true, delay: D0 });
  // the medal flips up to face you (a turn and a half, landing with a small settle), and the light runs across it as it lands
  const coin = m.querySelector('.coin');
  coin.animate([{ transform: 'rotateY(-540deg) rotateX(18deg) scale(.7)' }, { transform: 'rotateY(12deg) rotateX(-4deg) scale(1.03)', offset: .78 }, { transform: 'rotateY(0) rotateX(0) scale(1)' }], { duration: RM ? 1 : 1150, delay: D0, easing: 'cubic-bezier(.22,.7,.2,1)', fill: 'both' });
  m.querySelector('.sh').firstElementChild?.remove(); const glint = document.createElement('i'); glint.style.cssText = 'position:absolute;inset:-20%;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.9) 50%,transparent 62%);mix-blend-mode:overlay;transform:translate3d(-120%,0,0)'; m.querySelector('.sh').append(glint);
  glint.animate([{ transform: 'translate3d(-120%,0,0)' }, { transform: 'translate3d(120%,0,0)' }], { duration: RM ? 1 : 900, delay: D0 + 960, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
  setTimeout(() => buzz(18), RM ? 0 : D0 + 960);
  go($('#recT'), [{ opacity: 0, transform: 'translate3d(0,1rem,0)' }, { opacity: 1, transform: 'none' }], { key: 'o', delay: D0 + 400, keep: true });
  const done = () => { $('#rec').removeEventListener('click', done); clearTimeout(rt); landMedal(k); };
  const rt = setTimeout(done, 3600); $('#rec').addEventListener('click', done);
}
function landMedal(k) {
  const m = $('#medal'), r0 = m.getBoundingClientRect(), r1 = tickRect(k);
  go(m, [{ transform: 'none', opacity: 1 }, { transform: `translate3d(${r1.left + r1.width / 2 - (r0.left + r0.width / 2)}px,${r1.top + r1.height / 2 - (r0.top + r0.height / 2)}px,0) scale(.05)`, opacity: .4 }], { key: 'm', keep: true, dur: SP.dur + 120 });
  go($('#recBg'), [{ opacity: 1 }, { opacity: 0 }], { key: 'o', dur: 420, easing: 'ease', keep: true });
  go($('#recT'), [{ opacity: 1 }, { opacity: 0 }], { key: 'o', dur: 200, keep: true });
  // the light that caught the medal passes on across the bar it was lifted on
  if (STG.s) setTimeout(() => stageDo(() => STG.s.sweep()), 160);
  setTimeout(() => { phone.classList.remove('recOn'); $('#rec').style.pointerEvents = 'none'; [m, $('#recBg'), $('#recT')].forEach(x => { x.getAnimations().forEach(a => a.cancel()); x.style.opacity = ''; x.style.transform = ''; }); m.querySelector('.sh').getAnimations().forEach(a => a.cancel());
    if (W && W.rest) setView('rest'); else if (W) { setView('train'); restFades(false); renderSet(false); fades(true); } // the rest ran out under the medal
    paintSess(); buzz(10); }, SP.dur + 80);
}
let sessOpen = false;
function openSess() {
  if (sessOpen || !W) return; sessOpen = true; const tr = $('#sessT');
  $('#sTIn').innerHTML = `<h4 class="serif" style="margin:0 0 1rem;font-weight:400;font-size:3rem;display:flex;justify-content:space-between;align-items:center">${t('whole')}<button class="circ close" data-sclose aria-label="Close" style="background:rgba(255,255,255,.1);width:4.6rem;height:4.6rem"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></h4>` +
    W.ex.map((e, ei) => `<button class="sx2 ${ei === W.e ? 'cur' : ''}" data-j="${ei}"><div><div class="a">${exN(e)}</div><div class="b tab">${e.sets.length} × ${e.sets[0][1]} · ${kgFmt(e.sets[e.sets.length - 1][0])} kg</div></div><div class="dots">${e.sets.map((_, si) => { const k = W.ex.slice(0, ei).reduce((a, x) => a + x.sets.length, 0) + si; return `<i class="${W.flags[k] === 'g' ? 'g' : W.flags[k] ? 'd' : ''}"></i>`; }).join('')}</div></button>`).join('') +
    `<button id="holdB"><i></i><span>${t('hold')}</span></button>`;
  tr.classList.add('on'); $('#scrim').classList.add('on'); buzz(6);
  go(tr, [{ clipPath: rectInsetIn($('#sessB'), tr, 2.3) }, { clipPath: 'inset(0rem 0rem 0rem 0rem round 3rem)' }], { pseudo: '::before', key: 'clip' });
  go($('#sTIn'), [{ opacity: 0, transform: 'translate3d(0,-1rem,0)' }, { opacity: 1, transform: 'none' }], { key: 'in', delay: 60 });
  bindHold();
}
function closeSess() {
  if (!sessOpen) return; sessOpen = false; const tr = $('#sessT'); tr.classList.remove('on'); if (!sheetOpen) $('#scrim').classList.remove('on');
  go(tr, [{ clipPath: 'inset(0rem 0rem 0rem 0rem round 3rem)' }, { clipPath: rectInsetIn($('#sessB'), tr, 2.3) }], { pseudo: '::before', key: 'clip' }).finished.then(x => x.cancel()).catch(() => {});
  go($('#sTIn'), [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(0,-1rem,0)' }], { key: 'in', dur: 160 });
}
$('#sessB').addEventListener('click', openSess);
$('#sill').addEventListener('click', () => { if (S.view === 'train' || S.view === 'rest') openSess(); });
$('#sessT').addEventListener('click', e => {
  if (e.target.closest('[data-sclose]')) return closeSess();
  const j = e.target.closest('[data-j]'); if (!j || !W || W.rest) return;
  const ei = +j.dataset.j; if (ei === W.e) return closeSess();
  const dn = W.done[ei].filter(Boolean).length; if (dn >= W.ex[ei].sets.length) return closeSess(); // a finished lift cannot be logged twice
  W.end = false; W.e = ei; W.s = dn; W.idx = idxAt(ei, W.s);
  closeSess(); renderSet(); go($('#exName'), [{ transform: 'translate3d(6rem,0,0)', opacity: 0 }, { transform: 'none', opacity: 1 }], { key: 'nm' });
});
function bindHold() { // hold to commit: the world goes soft while the button fills, one calm finish
  const b = $('#holdB'), fill = b.querySelector('i'), soft = $('#soft'); let a1 = null, a2 = null, tm = 0; const HOLD = 1100;
  const down = e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch {} buzz(6); b.querySelector('span').textContent = t('holding');
    const q = new DOMMatrix(getComputedStyle(fill).transform).a || 0; a1 && a1.cancel(); a2 && a2.cancel();
    a1 = fill.animate([{ transform: `scaleX(${q})` }, { transform: 'scaleX(1)' }], { duration: HOLD * (1 - q), easing: 'linear', fill: 'forwards' });
    a2 = soft.animate([{ opacity: q }, { opacity: 1 }], { duration: HOLD * (1 - q), easing: 'linear', fill: 'forwards' });
    tm = setTimeout(() => { b.removeEventListener('pointerup', up); b.removeEventListener('pointerleave', up); finish(); }, HOLD * (1 - q)); };
  const up = () => { clearTimeout(tm); if (!a1) return; b.querySelector('span').textContent = t('hold');
    const q = new DOMMatrix(getComputedStyle(fill).transform).a; a1.cancel(); a2.cancel();
    a1 = fill.animate([{ transform: `scaleX(${q})` }, { transform: 'scaleX(0)' }], { duration: 260, easing: SP.easing, fill: 'forwards' });
    a2 = soft.animate([{ opacity: q }, { opacity: 0 }], { duration: 260, easing: 'ease', fill: 'forwards' }); };
  b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
}
function finish() {
  if (SAVER && W && !W.saved) { persist('Sets saved'); SAVER.finish(snapW()); W.saved = true; } else if (W && !W.saved) W.finishPending = true; // the database was not open yet: the finish is saved the moment it is
  buzz([30, 50, 30]); if (W.rest) clearRest();
  closeSess(); setView('complete'); fades(false); restFades(false);
  if (STG.s) stageDo(() => STG.s.putAway()); // behind the summary, the plates come off and the equipment is put away
  const soft = $('#soft'); soft.getAnimations().forEach(a => a.cancel()); soft.style.opacity = 1;
  const secs = Math.floor((Date.now() - W.t0) / 1000), sets = W.done.flat().filter(Boolean).length;
  const C = $('#cmp'); C.classList.add('on');
  // an earned summary: what you did, what comes next, and a kind place for anything that didn't fit (never a blame list)
  const skipped = W.ex.filter((e, i) => !W.done[i].filter(Boolean).length);
  const next = W.ex.map((e, i) => ({ e, d: W.done[i].filter(Boolean) })).filter(x => x.d.length).slice(0, 3).map(({ e, d }) => {
    const [, st] = kitOf(e), hit = d.length === e.sets.length && d.every((x, k) => x[1] >= e.sets[k][1]), top = Math.max(...d.map(x => x[0])), reps = e.sets[e.sets.length - 1][1];
    return `<div class="row"><span>${exN(e)}</span><b class="tab">${hit ? `${kgFmt(+(top + st).toFixed(2))} kg × ${reps}` : `${kgFmt(top)} kg × ${reps}`}</b></div>`;
  }).join('');
  const recs = W.rec.length;
  C.innerHTML = `<div class="ring c"><div class="in"><div id="cKg" class="tab"></div><small>${t('kgLifted')}</small></div></div>
    <h2 class="c">${sets < W.total ? t('earned') : t('complete')}</h2>
    ${sets < W.total ? `<p class="c cnext" style="margin-top:1.2rem">${t('earnedP', { a: sets, b: W.total })}</p>` : ''}
    <div class="cst c tab"><div>${dur(Math.max(1, Math.round(secs / 60)))}<small>${t('cTime')}</small></div><div>${sets}<small>${t('cSets')}</small></div>${recs ? `<div>${recs}<small>${recs === 1 ? t('cRec1') : t('cRec')}</small></div>` : ''}</div>
    ${recs ? `<div class="medals c">${W.rec.map((r, i) => `<div><button class="md" data-md="${i}">${kgFmt(r.w)} kg</button><div class="mdl">${shortName(W.ex[r.e])} × ${r.r}</div></div>`).join('')}</div>` : ''}
    ${next ? `<div class="nt c"><div class="kk">${t('nextK')}</div>${next}</div>` : ''}
    ${skipped.length ? `<div class="rs c"><div class="kk" style="font-size:1.2rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2);font-weight:500">${t('reschK')}</div><p>${t('reschP', { l: skipped.map(exN).join(', ') })}</p><button id="rsB">${t('reschA')}</button></div>` : ''}
    <button id="doneB">${t('doneB')}</button>`;
  $('#rsB')?.addEventListener('click', e => { const b = e.currentTarget; b.disabled = true; b.textContent = '✓ ' + t('reschD'); buzz(8); toast(t('reschD'), () => { b.disabled = false; b.textContent = t('reschA'); }); });  // one motion: the whole summary rises together (no cascade); only the kilos keep counting up
  $$('#cmp .c').forEach(el => go(el, [{ opacity: 0, transform: 'translate3d(0,1.6rem,0)' }, { opacity: 1, transform: 'none' }], { key: 'c', delay: 140, keep: true }));
  new Roller($('#cKg')).spin(intFmt(W.vol), { delay: 260, base: 900, step: 160 });
  $$('#cmp .md').forEach(m => m.addEventListener('click', () => { buzz(6); m.animate([{ transform: 'rotateY(0) translate3d(0,0,0)' }, { transform: 'rotateY(180deg) translate3d(0,-.6rem,2rem)', offset: .5 }, { transform: 'rotateY(360deg)' }], { duration: 900, easing: 'cubic-bezier(.3,.7,.3,1)' }); }));
  $('#doneB').addEventListener('click', backToday);
  S.done = true; S.live = false; clearInterval(clkTm); clkTm = 0; paintSess();
}
function backToday() {
  const C = $('#cmp'); C.classList.remove('on');
  go($('#soft'), [{ opacity: 1 }, { opacity: 0 }], { key: 'o', dur: 500, easing: 'ease', keep: true });
  $$('#cmp .c, #doneB').forEach(el => go(el, [{ opacity: 1 }, { opacity: 0 }], { key: 'c', dur: 200, keep: true }));
  setTimeout(() => { C.innerHTML = ''; $('#soft').getAnimations().forEach(a => a.cancel()); $('#soft').style.opacity = 0; }, 520);
  setView('today'); pushTo(0, 700); backIn();
  $('#aSess').setAttribute('stroke', '#f2c46a'); $('#aSessG').setAttribute('stroke', '#f2c46a'); $('#aLab').textContent = `${hm(915)} ${t('push').toUpperCase()} ✓`; $('#aLab').setAttribute('fill', '#ffe2a8');
  // the cards and words catch up a moment later, while the screen is still gliding back, so the hand-off frame stays light
  setTimeout(() => { paintCards(); paintCta(); $('#coach').__h = null; paintHero(nowMin()); built.train = false; if (S.tab === 'train') { BUILD.train(); built.train = true; } }, SP.dur + 60);
  toast(t('savedPush'));
}

/* ================= the morning: the night you slept through runs past ================= */
function morning() {
  const end = nowMin(), start = Math.max(0, Math.min(end - 60, 300)), t0 = performance.now(), ms = 1700; springId++;
  const st = () => { const k = clamp((performance.now() - t0) / ms, 0, 1), e = springAt(k); const m = lerp(start, end, e); placeDot(m); applyLight(m, k === 1); paintHero(k === 1 ? end : Math.round(m / 10) * 10); if (k < 1) requestAnimationFrame(st); };
  requestAnimationFrame(st);
}

/* ================= boot: everything is built and warmed before the first tap ================= */
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (sheetOpen) closeSheet(); else if (sessOpen) closeSess(); else if (S.view === 'train' || S.view === 'rest') minimise(); else if (S.tab !== 'today') show('today'); } });
const nf = () => new Promise(r => requestAnimationFrame(() => r()));
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
async function boot() {
  findSunTimes();
  $$('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  // the first open of a morning plays the night you slept through; everything starts where that sweep starts, so the
  // still copy on a cold start and the live screen under it are the same picture
  const now0 = nowMin(), day = new Date().toDateString(), wake = now0 > 300 && now0 < 660 && store.get('morning') !== day;
  const m = wake ? Math.max(0, Math.min(now0 - 60, 300)) : now0;
  LIGHT = lightAt(dateAtMin(m));
  buildArc(); placeDot(m); paintCards(); $('#arcHint').textContent = t('arcHint'); if (store.get('arcHint')) $('#arcHint').style.opacity = 0; paintCta(); paintHero(m); paintWx(m);
  // a cold start shows the numbers at once: a still copy of Today's first screen sits over the veil while the photo loads
  // and the graphics warm up underneath; then both lift together and the live screen is already in the same place.
  // The type is self-hosted and preloaded, so this wait is normally zero; the cap only matters on a very slow first load.
  try { await Promise.race([Promise.all(['300 100px Geist', '400 16px Geist', 'italic 40px "Instrument Serif"'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 250))]); } catch {}
  showSplash(); window.__numbersAt = performance.now();
  await nf(); // the numbers are painted first; the other four screens, the photo and the warm-up all come after
  ['train', 'fuel', 'health', 'coach'].forEach(k => { BUILD[k](); built[k] = true; });
  try {
    initGL();
    const [ph, mk] = await Promise.all([loadImg(ASSET + 'photo.jpg'), loadImg(ASSET + 'mask.png')]);
    await Promise.all([ph.decode?.(), mk.decode?.()].filter(Boolean));
    tex(ph, 0); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); tex(mk, 1); glReady = true;
  } catch (err) { console.error(err); }
  sizeCanvas(); applyLight(m); draw();
  try { await Promise.race([Promise.all(['200 100px Geist', '300 20px Geist', '400 16px Geist', '500 16px Geist', 'italic 40px "Instrument Serif"'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 1800))]); } catch {}
  await warmUp();
  window.addEventListener('resize', () => { sizeCanvas(); render(); });
  $('#veil').classList.add('off'); $('#splash').classList.add('off'); setTimeout(() => { $('#splash').innerHTML = ''; }, 700); window.__ready = true; window.__readyAt = performance.now();
  (window.requestIdleCallback || (f => setTimeout(f, 3000)))(() => { if (!rainMade) makeRain(); }, { timeout: 5000 }); // rain tiles ready before any shower
  // the first open: the rings draw, the numbers count, the week grows
  paintReady(m, 'draw'); growBars(true); // from the same minute the screen was painted at, so the count-up never mixes two times
  if (wake) { store.set('morning', day); setTimeout(morning, 450); }
  // the workout's 3D equipment loads once Today has settled; until it is ready the workout shows its numbers on the photo
  setTimeout(() => (window.requestIdleCallback || (f => setTimeout(f, 1)))(loadStage, { timeout: 2500 }), 1800);
  // the database opens once Today is up (it never holds up the numbers); a workout started before it was ready is saved the moment it is
  if (Q.get('nosave') === null) Engine.open().then(e => { SAVER = new Saver(e, saveFailed); window.__saver = SAVER; restoreFoods(); resumeDraft(); if (W && !W.saved) { persist('Started Push'); if (W.finishPending) { SAVER.finish(snapW()); W.saved = true; } saveRest(); } }).catch(err => { console.warn('save', err); saveFailed(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) rollDay(); });
  setInterval(() => { rollDay(); if (S.scrub === null && springIdle()) { const n = nowMin(); applyLight(n); placeDot(n); paintHero(n); paintWx(n); } }, 20000);
}
const springIdle = () => true;
function showSplash() {
  const sp = $('#splash'), scr = $('.scr[data-s="today"]').cloneNode(true), nav = document.querySelector('#phone nav');
  scr.classList.add('on', 'in'); scr.querySelectorAll('.rise').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; }); scr.querySelectorAll('.swap.out').forEach(el => el.classList.remove('out'));
  // words still on their way in (a swap lands 150 ms after it starts) go into the copy as they will read
  const live = $$('#sToday .swap'); scr.querySelectorAll('.swap').forEach((el, i) => { const h = live[i] && live[i].__h; if (h != null && el.firstElementChild) el.firstElementChild.innerHTML = h; });
  // the photo behind the copy is dimmed to the hour it shows, so a night start never flashes a daylight picture
  const a = LIGHT.s.alt; sp.style.setProperty('--spd', (a > 2 ? .26 : a > -6 ? .26 + (2 - a) / 8 * .3 : .74).toFixed(2));
  sp.append(scr); if (nav) sp.append(nav.cloneNode(true)); window.__splashAt = performance.now();
}
// warm-up under the veil. The GPU compiles a shader the first time it meets a new kind of picture (a glass layer that is
// scaled, clipped half-way or faded, blurred text, a 3D turn, a blend), and that is what made first taps stutter. So every
// screen, sheet and in-between state is drawn here once, and every kind of motion is played once for real.
async function warmUp() {
  const quiet = document.createElement('style'); quiet.textContent = '*,*::before,*::after{transition:none!important;animation-play-state:paused!important}'; document.head.append(quiet);
  const warm = document.createElement('style'); document.head.append(warm);
  const FULL = '#phone .scr .rise,#phone .scr .hero>:not(.hdr){opacity:1;transform:none}.scr{visibility:visible!important}.sheet::before,#sessT::before,#tray::before{clip-path:inset(0 round 0)!important}.si,.sT,.tr{opacity:1!important;transform:none!important}#soft{opacity:1!important}#toast{transform:translate3d(-50%,0,0)!important}.stp button{transform:none!important}#medal{opacity:1!important;transform:none!important}#recBg{opacity:.5!important}#recT{opacity:1!important}#level{opacity:1!important}#live{transform:none!important}#askBar,#askX{transform:none!important}#light{opacity:1!important;transform:none!important}.lay{opacity:.4!important}#phone.raining #rainW{opacity:.7!important}';
  const MID = '#phone .scr .rise,#phone .scr .hero>:not(.hdr){opacity:.5;transform:translate3d(0,2rem,0)}.scr{visibility:visible!important}.sheet::before,#sessT::before{clip-path:inset(22% 12% 30% 9% round 2.4rem)!important}#tray::before{clip-path:inset(0 0 45% 0 round 2.6rem)!important}' +
    '.si,.sT,.tr{opacity:.5!important;transform:translate3d(0,1rem,0)!important}#soft{opacity:.45!important}#toast{transform:translate3d(-50%,-1rem,0) scale(.97)!important}' +
    '.stp button{transform:scale(.55)!important}.glass{transform:scale(.97)}.rise{opacity:.5;transform:translate3d(0,2rem,0)}#medal{opacity:.7!important;transform:rotateY(-42deg) scale(.8)!important}#medal .sh{transform:translate3d(-10%,0,0)!important}' +
    '#recBg,#recT{opacity:.5!important}#setB{transform:translate3d(3rem,8rem,0) scale(.3)!important;opacity:.5!important}#logL,.lb{filter:blur(.4rem)!important;opacity:.6!important}' +
    '#level{opacity:.6!important;transform:translate3d(0,40%,0)!important}.lay{opacity:.6!important}#light{opacity:.6!important;transform:translate3d(0,20%,0)!important}#scene{transform:scale(1.04)!important}' +
    '.st{transform:scaleY(.4)}.md{transform:rotateY(70deg) translate3d(0,-.6rem,2rem)}#cmp .c{opacity:.5;transform:translate3d(0,1rem,0)}.exc{clip-path:inset(0 0 30% 0 round 2.8rem)}';
  $$('.sheet').forEach(s => s.classList.add('on')); $('#sessT').classList.add('on'); $('#tray').classList.add('on');
  buildSettings(); buildLog(); if (!rainMade && LIGHT.wx.rain) makeRain(); // raining at load: the rain tiles are drawn here, under the veil
  $$('.jar .lv').forEach(l => l.style.rotate = '1deg');
  $('#trIn').innerHTML = `<div class="k">${t('coachK')}</div><p>${t('coachP')}</p><div class="r"><button class="use"><span class="lb">${t('use85')}</span></button></div>`;
  $('#cmp').innerHTML = `<div class="ring c"><svg viewBox="0 0 260 260"><circle cx="130" cy="130" r="122" stroke="var(--gold)" stroke-dasharray="766.5" stroke-dashoffset="300"/></svg></div><div class="medals c"><div class="md">85</div></div>`;
  $('#thread').innerHTML = `<div class="me">.</div><div class="think"><i></i></div><div class="prop glass"><p>.</p><div class="r"><button class="use"><span class="lb">.</span></button></div></div>`;
  W = freshW(); buildSess(); renderSet(true); buildEd(); buildExplain(PUSH[0]); $('#mvIn').innerHTML = '<h4>.</h4><p>.</p><button class="mv-o rec"><em>.</em><b>.</b><span>.</span></button>';
  const rehearse = () => {
    const A = (el, kf, o = {}) => el && el.animate(kf, { duration: 140, easing: SP.easing, ...o });
    $$('.glass,.stp button,.exc,.disc').forEach(el => A(el, [{ transform: 'scale(.9)', opacity: .6 }, { transform: 'scale(1.02)', opacity: 1 }, { transform: 'none', opacity: 1 }]));
    $$('.rise').forEach(el => A(el, [{ transform: 'translate3d(0,4rem,0)', opacity: 0 }, { transform: 'none', opacity: 1 }]));
    $$('#logL,.lb,.lg,.swap span').forEach(el => A(el, [{ filter: 'blur(4px)', opacity: .3 }, { filter: 'blur(0)', opacity: 1 }]));
    A($('#medal'), [{ transform: 'rotateY(-70deg) scale(.6)', opacity: .4 }, { transform: 'none', opacity: 1 }]);
    A($('#medal .sh'), [{ transform: 'translate3d(-80%,0,0)' }, { transform: 'translate3d(80%,0,0)' }]);
    A($('#soft'), [{ opacity: .1 }, { opacity: .9 }]); A($('#recBg'), [{ opacity: .1 }, { opacity: .6 }]);
    A($('#setB'), [{ transform: 'translate3d(4rem,10rem,0) scale(.1)', opacity: .2 }, { transform: 'none', opacity: 1 }]);
    A($('#level'), [{ transform: 'translate3d(0,80%,0)' }, { transform: 'translate3d(0,20%,0)' }]);
    ['.sheet', '#sessT', '#tray'].forEach(s => $$(s).forEach(el => A(el, [{ clipPath: 'inset(40% 30% 40% 30% round 2.4rem)' }, { clipPath: 'inset(0 round 0)' }], { pseudoElement: '::before' })));
    $$('.exc,.prop,#hDet').forEach(el => A(el, [{ clipPath: 'inset(0 0 40% 0 round 2.8rem)' }, { clipPath: 'inset(0 0 0 0 round 2.8rem)' }]));
    $$('.md').forEach(el => A(el, [{ transform: 'rotateY(0)' }, { transform: 'rotateY(180deg) translate3d(0,-.6rem,2rem)' }, { transform: 'rotateY(360deg)' }]));
    $$('circle').forEach(el => A(el, [{ strokeDashoffset: 700 }, { strokeDashoffset: 200 }]));
    $$('.strip').forEach(el => A(el, [{ transform: 'translate3d(0,-10%,0)' }, { transform: 'translate3d(0,-40%,0)' }]));
    $$('.st,.day .b i,.bars7 i').forEach(el => A(el, [{ transform: 'scaleY(0)' }, { transform: 'none' }]));
    $$('#pearl i').forEach(el => A(el, [{ transform: 'scale(0)' }, { transform: 'scale(1.2)' }]));
    $$('#scene').forEach(el => A(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }]));
    $$('#light').forEach(el => A(el, [{ transform: 'translate3d(0,45%,0)', opacity: 0 }, { transform: 'none', opacity: 1 }]));
    $$('.lay').forEach(el => A(el, [{ opacity: 0 }, { opacity: .8 }]));
    $$('#rain i').forEach(el => A(el, [{ transform: 'none' }, { transform: 'translate3d(0,20rem,0)' }]));
    $$('.spark').forEach(el => A(el, [{ clipPath: 'inset(-20% 80% -20% 0)' }, { clipPath: 'inset(-20% 0% -20% 0)' }]));
    bloom($('#cta')); bloom($('#pearl'), 'rgba(255,170,120,.5)');
  };
  for (const [v, tab] of [['today', 'today'], ['today', 'train'], ['today', 'fuel'], ['today', 'health'], ['today', 'coach'], ['train', 'today'], ['rest', 'today'], ['record', 'today'], ['complete', 'today']]) {
    setView(v); phone.dataset.tab = tab; fades(v !== 'today'); restFades(v === 'rest');
    scene.push = v === 'today' ? 0 : 1; draw();
    warm.textContent = FULL; rehearse(); for (let i = 0; i < 6; i++) await nf();
    for (const css of [MID, FULL]) { warm.textContent = css; await nf(); await nf(); }
  }
  document.getAnimations().forEach(a => { try { a.finish(); } catch { a.cancel(); } });
  document.getAnimations().forEach(a => a.cancel());
  warm.remove(); $$('.sheet').forEach(s => s.classList.remove('on')); $('#sessT').classList.remove('on'); $('#tray').classList.remove('on');
  $('#trIn').innerHTML = ''; $('#cmp').innerHTML = ''; $('#thread').innerHTML = ''; $('#edIn').innerHTML = ''; $('#mvIn').innerHTML = ''; $('#exIn').innerHTML = ''; fades(false); restFades(false);
  W = null; $('#sess').innerHTML = ''; setView('today'); phone.dataset.tab = 'today'; scene.push = 0; draw();
  $$('.jar .lv').forEach(l => l.style.rotate = '');
  $$('.scr').forEach(s => { s.classList.toggle('on', s.dataset.s === 'today'); s.classList.toggle('in', s.dataset.s === 'today'); s.classList.remove('out'); });
  growBars(false); bigR.set(bigR.s, {}); $('#rwL').style.setProperty('--f', '0%');
  await nf(); await nf(); quiet.remove();
}
boot();
window.__aven = { S, canTrimLive: () => canTrimLive(), trimLive: () => trimLive(), openMeals: () => MEALS.filter(x => !eatenAt(nowMin()).includes(x)).map(x => x.k), get W() { return W; }, startWorkout, show, logSet: () => $('#logB').click(), endRest, finish, minimise, morning, scrubTo: m => { placeDot(m); applyLight(m); paintHero(m); paintWx(m); },
  // test hooks: which of the shader's uniforms one frame leaves unset, and a small grid of the sky at an hour and weather
  uniformsUnset: () => { const set = new Set(), ks = ['uniform1f', 'uniform2f', 'uniform3f', 'uniform4f', 'uniform1i']; ks.forEach(k => { const o = gl[k]; gl[k] = function (loc, ...a) { set.add(loc); return o.call(gl, loc, ...a); }; }); try { draw(); } finally { ks.forEach(k => delete gl[k]); } return Object.keys(U).filter(n => !set.has(U[n])); },
  sky: (m, mode) => { WXMODE = mode; LIGHT = lightAt(dateAtMin(m)); draw(); const c = document.createElement('canvas'); c.width = 43; c.height = 93; const x = c.getContext('2d'); x.drawImage(cv, 0, 0, 43, 93); const d = x.getImageData(0, 0, 43, 93).data, g = []; for (let i = 0; i < d.length; i += 4) g.push(d[i], d[i + 1], d[i + 2]);
    const h = document.createElement('canvas'); h.width = 430; h.height = 280; h.getContext('2d').drawImage(cv, 0, 0, cv.width, cv.height * .3, 0, 0, 430, 280); const e = h.getContext('2d').getImageData(0, 0, 430, 280).data; let stars = 0; for (let i = 0; i < e.length; i += 4) if (e[i] + e[i + 1] + e[i + 2] > 330) stars++;
    return { g, stars }; },
  setWx: w => { WXMODE = w; lastAcc = ''; applyLight(nowMin()); paintWx(nowMin()); paintHero(nowMin()); }, nowMin, openSheet, SP };

// offline and installed: the worker saves the app on the first visit (see public/sw.js)
if ('serviceWorker' in navigator && Q.get('nosw') === null) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
