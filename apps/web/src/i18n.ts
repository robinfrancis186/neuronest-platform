import { createContext, useContext } from "react";
export type Language = "en" | "ml";
export const LanguageContext = createContext<Language>("en");
export function preferredLanguage(fallback: Language = "en"): Language {
  try {
    const saved = localStorage.getItem("neuronest.language");
    return saved === "en" || saved === "ml" ? saved : fallback;
  } catch {
    return fallback;
  }
}
export function rememberLanguage(language: Language) {
  try {
    localStorage.setItem("neuronest.language", language);
  } catch {
    // Language switching still works when browser storage is unavailable.
  }
}
// Original record text, clinician notes, and external source titles retain their authored language.
const malayalam: Record<string, string> = Object.fromEntries(
  `
Colour match|നിറം കണ്ടെത്താം
Count the garden|പൂക്കൾ എണ്ണാം
Big or small?|വലുതോ ചെറുതോ?
Turn over two cards at a time to find matching pictures.|ഒരേസമയം രണ്ട് കാർഡുകൾ മറിച്ച് ഒരേ ചിത്രങ്ങളുള്ള ജോഡികൾ കണ്ടെത്തുക.
Find the colour that matches. Name it together as you play.|പൊരുത്തപ്പെടുന്ന നിറം കണ്ടെത്തുക. കളിക്കുമ്പോൾ ഒരുമിച്ച് അതിന്റെ പേര് പറയാം.
Count the flowers and choose the matching number.|പൂക്കൾ എണ്ണി ശരിയായ സംഖ്യ തിരഞ്ഞെടുക്കുക.
Look at the two balls and compare their sizes.|രണ്ട് പന്തുകളും നോക്കി അവയുടെ വലുപ്പം താരതമ്യം ചെയ്യുക.
Faces and smiles|മുഖങ്ങളും പുഞ്ചിരികളും
Talk face-to-face during a calm everyday moment.|ശാന്തമായ സമയത്ത് മുഖാമുഖം നോക്കി സംസാരിക്കുക.
Hold your baby comfortably and talk softly about what you are doing.|കുഞ്ഞിനെ സൗകര്യമായി താങ്ങിപ്പിടിച്ച് നിങ്ങൾ ചെയ്യുന്നതിനെക്കുറിച്ച് മൃദുവായി സംസാരിക്കുക.
Try a gentle smile or a short sound, then pause to notice their response.|സൗമ്യമായി പുഞ്ചിരിക്കുകയോ ചെറിയൊരു ശബ്ദം ഉണ്ടാക്കുകയോ ചെയ്ത ശേഷം കുഞ്ഞിന്റെ പ്രതികരണം ശ്രദ്ധിക്കുക.
Follow your baby’s cues. Look away or stop if they seem tired or uncomfortable.|കുഞ്ഞിന്റെ സൂചനകൾ ശ്രദ്ധിക്കുക. ക്ഷീണമോ അസൗകര്യമോ തോന്നിയാൽ കണ്ണ് മാറ്റുകയോ നിർത്തുകയോ ചെയ്യുക.
Songs and pauses|പാട്ടുകളും ഇടവേളകളും
Share a familiar song and leave room for a response.|പരിചിതമായ പാട്ട് പാടി പ്രതികരണത്തിന് സമയം നൽകുക.
Choose a short, familiar song and sing gently in a language you enjoy.|ഇഷ്ടമുള്ള ഭാഷയിലെ ചെറിയൊരു പരിചിത പാട്ട് സൗമ്യമായി പാടുക.
Pause between lines and notice a look, sound, sign or movement. No response is required.|വരികൾക്കിടയിൽ നിർത്തി ഒരു നോട്ടമോ ശബ്ദമോ ആംഗ്യമോ ചലനമോ ശ്രദ്ധിക്കുക. പ്രതികരിക്കണമെന്ന് നിർബന്ധമില്ല.
For older toddlers, invite a familiar action or word without asking them to perform.|മുതിർന്ന കുഞ്ഞുങ്ങളെ പരിചിതമായ ചലനമോ വാക്കോ ഉപയോഗിക്കാൻ സൗമ്യമായി ക്ഷണിക്കുക; നിർബന്ധിക്കേണ്ടതില്ല.
Peek-a-boo together|ഒളിച്ചും കണ്ടും കളിക്കാം
Take gentle turns appearing and saying hello.|മാറിമാറി ഒളിഞ്ഞും തെളിഞ്ഞും സൗമ്യമായി അഭിവാദ്യം ചെയ്യാം.
Sit comfortably where your baby can see you. Briefly cover your own face with your hands.|കുഞ്ഞിന് നിങ്ങളെ കാണാനാകുന്നിടത്ത് സൗകര്യമായി ഇരിക്കുക. നിങ്ങളുടെ മുഖം മാത്രം കൈകളാൽ ഒരു നിമിഷം മറയ്ക്കുക.
Uncover your face and say hello softly. Wait and notice their response.|മുഖം തെളിച്ച് മൃദുവായി അഭിവാദ്യം ചെയ്യുക. കാത്തിരുന്ന് കുഞ്ഞിന്റെ പ്രതികരണം ശ്രദ്ധിക്കുക.
Keep your baby’s face uncovered. Stop if they are startled or uninterested.|കുഞ്ഞിന്റെ മുഖം മറയ്ക്കരുത്. പേടിയോ താൽപര്യക്കുറവോ തോന്നിയാൽ നിർത്തുക.
Follow their interest and turn the page when they are ready.|കുട്ടിയുടെ താൽപര്യം പിന്തുടർന്ന് തയ്യാറാകുമ്പോൾ പേജ് മറിക്കുക.
Take turns with a wave, clap or familiar hand movement.|കൈ വീശലോ കൈയടിയോ പരിചിതമായ കൈച്ചലനമോ മാറിമാറി ചെയ്യുക.
Sit or stand comfortably in a safe space. Try a gentle wave or clap.|സുരക്ഷിതമായ ഇടത്ത് സൗകര്യമായി ഇരിക്കുകയോ നിൽക്കുകയോ ചെയ്യുക. സൗമ്യമായി കൈ വീശുകയോ കൈയടിക്കുകയോ ചെയ്യാം.
Invite your child to join in, or copy a movement they choose instead.|കുട്ടിയെ ഒപ്പം ചേരാൻ ക്ഷണിക്കുക, അല്ലെങ്കിൽ കുട്ടി തിരഞ്ഞെടുക്കുന്ന ചലനം നിങ്ങൾ അനുകരിക്കുക.
Let your child lead. Do not move their body for them or push an uncomfortable movement.|കുട്ടി നയിക്കട്ടെ. കുട്ടിയുടെ ശരീരം നിർബന്ധിച്ച് ചലിപ്പിക്കുകയോ അസൗകര്യമുള്ള ചലനം ചെയ്യിപ്പിക്കുകയോ അരുത്.
Point and name|ചൂണ്ടിക്കാട്ടി പേര് പറയാം
Notice and name familiar things in everyday life.|ദൈനംദിന ജീവിതത്തിലെ പരിചിത വസ്തുക്കൾ ശ്രദ്ധിച്ച് പേര് പറയുക.
Look at a familiar object together, such as a cup or shoe.|കപ്പോ ചെരുപ്പോ പോലുള്ള ഒരു പരിചിത വസ്തു ഒരുമിച്ച് നോക്കുക.
Name it and pause. Your child can respond with a look, gesture, sound or word.|പേര് പറഞ്ഞ ശേഷം കാത്തിരിക്കുക. കുട്ടിക്ക് നോട്ടത്തിലൂടെയോ ആംഗ്യത്തിലൂടെയോ ശബ്ദത്തിലൂടെയോ വാക്കിലൂടെയോ പ്രതികരിക്കാം.
Offer two familiar choices and follow what interests them. There is no need to test them.|പരിചിതമായ രണ്ട് കാര്യങ്ങളിൽ തിരഞ്ഞെടുക്കാൻ അവസരം നൽകി കുട്ടിയുടെ താൽപര്യം പിന്തുടരുക. പരീക്ഷിക്കേണ്ടതില്ല.
Sort and discover|തരംതിരിച്ച് കണ്ടെത്താം
Group large, safe objects by a feature you notice.|വലിയതും സുരക്ഷിതവുമായ വസ്തുക്കൾ ഒരു സവിശേഷതയുടെ അടിസ്ഥാനത്തിൽ കൂട്ടങ്ങളാക്കുക.
Choose a few large, safe objects, such as socks or soft toys. Avoid small parts and sharp objects.|സോക്സോ മൃദുവായ കളിപ്പാട്ടങ്ങളോ പോലുള്ള വലിയ സുരക്ഷിത വസ്തുക്കൾ തിരഞ്ഞെടുക്കുക. ചെറിയ ഭാഗങ്ങളും മൂർച്ചയുള്ള വസ്തുക്കളും ഒഴിവാക്കുക.
Put two similar objects together and describe what they share.|സമാനമായ രണ്ട് വസ്തുക്കൾ ഒരുമിച്ച് വെച്ച് അവയുടെ സാമ്യം പറയുക.
Let your child make their own groups. Talk about their choices rather than marking them right or wrong.|കുട്ടി സ്വന്തം രീതിയിൽ കൂട്ടങ്ങൾ ഉണ്ടാക്കട്ടെ. ശരിയോ തെറ്റോ എന്ന് പറയുന്നതിന് പകരം അവരുടെ തിരഞ്ഞെടുപ്പിനെക്കുറിച്ച് സംസാരിക്കുക.
A noticing walk|ചുറ്റും ശ്രദ്ധിക്കാം
Find shapes and colours together around your home.|വീട്ടിനുചുറ്റും ഒരുമിച്ച് ആകൃതികളും നിറങ്ങളും കണ്ടെത്തുക.
Choose a safe room or outdoor space and stay together.|സുരക്ഷിതമായ മുറിയോ പുറത്തെ ഇടമോ തിരഞ്ഞെടുത്ത് ഒരുമിച്ച് തുടരുക.
Look for something round, soft or a familiar colour. Let your child suggest what to notice next.|വൃത്താകൃതിയിലുള്ളതോ മൃദുവായതോ പരിചിത നിറത്തിലുള്ളതോ കണ്ടെത്തുക. അടുത്തത് എന്ത് ശ്രദ്ധിക്കണമെന്ന് കുട്ടി നിർദ്ദേശിക്കട്ടെ.
Describe what you find together. Keep household hazards out of reach.|കണ്ടെത്തിയതിനെക്കുറിച്ച് ഒരുമിച്ച് സംസാരിക്കുക. അപകടകരമായ വീട്ടുപകരണങ്ങൾ കുട്ടിക്ക് എത്താത്തിടത്ത് സൂക്ഷിക്കുക.
Build a story|ഒരു കഥ ഉണ്ടാക്കാം
Take turns adding one idea to a shared story.|ഒരുമിച്ചുള്ള കഥയിൽ മാറിമാറി ഓരോ ആശയം ചേർക്കുക.
Choose a familiar character, toy or picture as the start of your story.|പരിചിതമായ കഥാപാത്രമോ കളിപ്പാട്ടമോ ചിത്രമോ ഉപയോഗിച്ച് കഥ തുടങ്ങുക.
Take turns adding one idea through words, pictures, signs or gestures.|വാക്കുകളിലൂടെയോ ചിത്രങ്ങളിലൂടെയോ അടയാളങ്ങളിലൂടെയോ ആംഗ്യങ്ങളിലൂടെയോ മാറിമാറി ഓരോ ആശയം ചേർക്കുക.
Follow their imagination. Stop while it is still enjoyable, without correcting their story.|കുട്ടിയുടെ സങ്കൽപ്പം പിന്തുടരുക. കഥ തിരുത്താതെ, സന്തോഷത്തോടെ ചെയ്യുന്നതിനിടയിൽ നിർത്തുക.
0–5 months|0–5 മാസം
6–11 months|6–11 മാസം
1 year|1 വയസ്സ്
2 years|2 വയസ്സ്
3–4 years|3–4 വയസ്സ്
5 years and up|5 വയസ്സും അതിനു മുകളിലും
Loading activities…|പ്രവർത്തനങ്ങൾ തയ്യാറാക്കുന്നു…
A valid date of birth is needed to suggest activities. Select or update your child’s profile.|പ്രവർത്തനങ്ങൾ നിർദ്ദേശിക്കാൻ ശരിയായ ജനനത്തീയതി ആവശ്യമാണ്. കുട്ടിയുടെ പ്രൊഫൈൽ തിരഞ്ഞെടുക്കുകയോ പുതുക്കുകയോ ചെയ്യുക.
Open account|അക്കൗണ്ട് തുറക്കുക
For children under 2, choose shared play away from the screen. These game controls are for older children.|2 വയസ്സിന് താഴെയുള്ള കുട്ടികളുമായി സ്ക്രീൻ ഇല്ലാതെ ഒരുമിച്ച് കളിക്കുക. ഈ കളികൾ മുതിർന്ന കുട്ടികൾക്കുള്ളതാണ്.
See age-matched play|പ്രായത്തിനനുസരിച്ചുള്ള കളികൾ കാണുക
With an adult|മുതിർന്നയാളോടൊപ്പം
pairs to find|ജോഡികൾ കണ്ടെത്താം
short rounds|ചെറിയ ഘട്ടങ്ങൾ
Caregiver preview: this game is outside the current age suggestions. Start with the recommended activities for your child.|രക്ഷിതാവിനുള്ള പരീക്ഷണം: ഈ കളി നിലവിലെ പ്രായ നിർദ്ദേശങ്ങളിൽ ഉൾപ്പെടുന്നില്ല. കുട്ടിക്കായി നിർദ്ദേശിച്ച പ്രവർത്തനങ്ങളിൽ തുടങ്ങുക.
Picked for|തിരഞ്ഞെടുത്ത പ്രായം:
Shared play for you and your child. No child screen games at this age.|നിങ്ങൾക്കും കുട്ടിക്കും ഒരുമിച്ച് കളിക്കാം. ഈ പ്രായത്തിൽ കുട്ടിക്കുള്ള സ്ക്രീൻ കളികൾ ഇല്ല.
Short games and shared play, at their own pace.|കുട്ടിയുടെ വേഗത്തിനനുസരിച്ച് ചെറിയ കളികളും ഒരുമിച്ചുള്ള പ്രവർത്തനങ്ങളും.
Games to play together|ഒരുമിച്ച് കളിക്കാനുള്ള കളികൾ
Choices, pairs and patterns adapt to the selected age group.|തിരഞ്ഞെടുപ്പുകളും ജോഡികളും ക്രമങ്ങളും തിരഞ്ഞെടുത്ത പ്രായത്തിനനുസരിച്ച് മാറും.
Away from the screen|സ്ക്രീനിൽ നിന്ന് മാറി
Everyday ideas selected for your child’s age. Follow their interests.|കുട്ടിയുടെ പ്രായത്തിനനുസരിച്ചുള്ള ദൈനംദിന പ്രവർത്തനങ്ങൾ. അവരുടെ താൽപര്യങ്ങൾ പിന്തുടരുക.
Age is a starting point, not a test of ability. Choose what feels comfortable and stop when your child needs a break.|പ്രായം ഒരു തുടക്കം മാത്രമാണ്, കഴിവിന്റെ പരീക്ഷണമല്ല. സൗകര്യപ്രദമായത് തിരഞ്ഞെടുത്ത് കുട്ടിക്ക് ഇടവേള ആവശ്യമാകുമ്പോൾ നിർത്തുക.
Different pictures. Look at both, then try another pair.|വ്യത്യസ്ത ചിത്രങ്ങൾ. രണ്ടും നോക്കിയ ശേഷം മറ്റൊരു ജോഡി പരീക്ഷിക്കുക.
Red|ചുവപ്പ്
Yellow|മഞ്ഞ
Blue|നീല
Green|പച്ച
Bee|തേനീച്ച
Leaf|ഇല
Flower|പൂവ്
Ball|പന്ത്
Book|പുസ്തകം
Blocks|കളിക്കട്ടകൾ
Small ball|ചെറിയ പന്ത്
Big ball|വലിയ പന്ത്
Find this colour|ഈ നിറം കണ്ടെത്തുക
How many flowers?|എത്ര പൂക്കളുണ്ട്?
Find the smaller ball|ചെറിയ പന്ത് കണ്ടെത്തുക
Find the bigger ball|വലിയ പന്ത് കണ്ടെത്തുക
flowers|പൂക്കൾ
Choose an answer|ഒരു ഉത്തരം തിരഞ്ഞെടുക്കുക
Short games and everyday play to enjoy together, at your child’s pace.|കുട്ടിയുടെ വേഗത്തിനനുസരിച്ച് ഒരുമിച്ച് ആസ്വദിക്കാൻ ചെറിയ കളികളും ദൈനംദിന പ്രവർത്തനങ്ങളും.
Find the shape|ആകൃതി കണ്ടെത്താം
Match the pairs|ജോഡികൾ കണ്ടെത്താം
Finish the pattern|ക്രമം പൂർത്തിയാക്കാം
Noticing and naming|ശ്രദ്ധിക്കലും പേരുപറയലും
Remembering and matching|ഓർമ്മിക്കലും പൊരുത്തപ്പെടുത്തലും
Patterns and problem-solving|ക്രമങ്ങളും പ്രശ്നപരിഹാരവും
Look at a shape, then find the one that matches.|ആകൃതി നോക്കിയ ശേഷം അതിനോട് പൊരുത്തപ്പെടുന്നത് കണ്ടെത്തുക.
Turn over two cards at a time to find matching shapes.|ഒരേസമയം രണ്ട് കാർഡുകൾ മറിച്ച് ഒരേ ആകൃതിയുള്ള ജോഡികൾ കണ്ടെത്തുക.
Look at the shapes and choose what comes next.|ആകൃതികൾ നോക്കി അടുത്തതായി വരുന്നത് തിരഞ്ഞെടുക്കുക.
Sound and response|ശബ്ദവും മറുപടിയും
Communication and turn-taking|ആശയവിനിമയവും മാറിമാറി ചെയ്യലും
Take turns making sounds, words or signs.|മാറിമാറി ശബ്ദങ്ങളോ വാക്കുകളോ ആംഗ്യങ്ങളോ ഉപയോഗിക്കുക.
Get comfortable together. Notice a sound, word or sign your child chooses to make.|ഒരുമിച്ച് സൗകര്യമായി ഇരിക്കുക. കുട്ടി സ്വയം ഉപയോഗിക്കുന്ന ശബ്ദമോ വാക്കോ ആംഗ്യമോ ശ്രദ്ധിക്കുക.
Respond gently by copying it. Pause and give your child time to respond in their own way.|അത് സൗമ്യമായി അനുകരിച്ച് മറുപടി നൽകുക. കുട്ടിക്ക് സ്വന്തം രീതിയിൽ പ്രതികരിക്കാൻ സമയം നൽകുക.
Follow their interest. There is no need to ask them to repeat or make eye contact.|കുട്ടിയുടെ താൽപര്യം പിന്തുടരുക. ആവർത്തിക്കാനോ കണ്ണിൽ നോക്കാനോ നിർബന്ധിക്കേണ്ടതില്ല.
Picture stories|ചിത്രക്കഥകൾ
Language and shared attention|ഭാഷയും ഒരുമിച്ചുള്ള ശ്രദ്ധയും
Explore a picture book together and follow your child’s interest.|ഒരുമിച്ച് ചിത്രപുസ്തകം നോക്കുക; കുട്ടിയുടെ താൽപര്യം പിന്തുടരുക.
Choose a sturdy picture book and sit comfortably together. You do not need to read every word.|കേടുപാടില്ലാത്ത ചിത്രപുസ്തകം തിരഞ്ഞെടുത്ത് സൗകര്യമായി ഒരുമിച്ചിരിക്കുക. എല്ലാ വാക്കുകളും വായിക്കേണ്ടതില്ല.
Name something your child looks at or points to. Pause for a sound, gesture or comment.|കുട്ടി നോക്കുന്നതോ ചൂണ്ടിക്കാണിക്കുന്നതോ ആയ ഒന്നിന്റെ പേര് പറയുക. കുട്ടിയുടെ ശബ്ദത്തിനോ ആംഗ്യത്തിനോ അഭിപ്രായത്തിനോ സമയം നൽകുക.
For older children, take turns imagining what happens next. Accept their own version of the story.|മുതിർന്ന കുട്ടികളുമായി അടുത്തത് എന്താകുമെന്ന് മാറിമാറി സങ്കൽപ്പിക്കുക. കുട്ടിയുടെ കഥയും സ്വീകരിക്കുക.
Copy my moves|ചലനങ്ങൾ അനുകരിക്കാം
Movement and taking turns|ചലനവും മാറിമാറി ചെയ്യലും
Try a gentle wave, clap or familiar action together.|കൈ വീശലോ കൈയടിയോ പരിചിതമായ മറ്റൊരു ചലനമോ ഒരുമിച്ച് സൗമ്യമായി ചെയ്യുക.
For babies, let them watch you wave or smile while they are comfortably supported.|ശിശുവിനെ സൗകര്യമായി താങ്ങിയിരിക്കുമ്പോൾ നിങ്ങൾ കൈ വീശുന്നതോ പുഞ്ചിരിക്കുന്നതോ കാണാൻ അനുവദിക്കുക.
For older children, take turns copying a simple hand movement, such as a wave or clap.|മുതിർന്ന കുട്ടികളുമായി കൈ വീശലോ കൈയടിയോ പോലൊരു ലളിത ചലനം മാറിമാറി അനുകരിക്കുക.
Let your child choose the next action. Do not move their body for them or push an uncomfortable movement.|അടുത്ത ചലനം കുട്ടി തിരഞ്ഞെടുക്കട്ടെ. കുട്ടിയുടെ ശരീരം നിർബന്ധിച്ച് ചലിപ്പിക്കുകയോ അസൗകര്യമുള്ള ചലനം ചെയ്യിപ്പിക്കുകയോ വേണ്ട.
Ages 3+ with an adult|3 വയസ്സിന് മുകളിൽ, മുതിർന്നയാളോടൊപ്പം
Off-screen play|സ്ക്രീൻ ഇല്ലാതെയുള്ള കളി
Preview game|രക്ഷിതാവ് പരീക്ഷിക്കുക
Play|കളിക്കാം
Try together|ഒരുമിച്ച് ചെയ്യാം
All activities|എല്ലാ പ്രവർത്തനങ്ങളും
Restart game|കളി വീണ്ടും തുടങ്ങുക
Keep it gentle and child-led. Stop when your child seems tired, uncomfortable or uninterested.|സൗമ്യമായി, കുട്ടിയുടെ താൽപര്യത്തിന് അനുസരിച്ച് ചെയ്യുക. ക്ഷീണമോ അസൗകര്യമോ താൽപര്യക്കുറവോ തോന്നിയാൽ നിർത്തുക.
Caregiver preview: these screen games are suggested for ages 3 and up. Choose off-screen play with younger children.|രക്ഷിതാവിനുള്ള പരീക്ഷണം: ഈ സ്ക്രീൻ കളികൾ 3 വയസ്സിന് മുകളിലുള്ളവർക്കാണ് നിർദ്ദേശിക്കുന്നത്. ചെറിയ കുട്ടികളുമായി സ്ക്രീൻ ഇല്ലാത്ത കളികൾ തിരഞ്ഞെടുക്കുക.
Start with play together. For younger children, these are instructions for the caregiver, not screen activities for the child.|ഒരുമിച്ചുള്ള കളിയിൽ തുടങ്ങാം. ചെറിയ കുട്ടികൾക്കായി നൽകിയിരിക്കുന്നത് രക്ഷിതാവിനുള്ള നിർദ്ദേശങ്ങളാണ്; കുട്ടിക്കുള്ള സ്ക്രീൻ പ്രവർത്തനങ്ങളല്ല.
Play together, take turns and take breaks. Choose an activity that feels comfortable for your child.|ഒരുമിച്ച് കളിക്കുക, മാറിമാറി ചെയ്യുക, ഇടവേളകൾ എടുക്കുക. കുട്ടിക്ക് സൗകര്യപ്രദമായ പ്രവർത്തനം തിരഞ്ഞെടുക്കുക.
Play together|ഒരുമിച്ച് കളിക്കാം
Simple screen games|ലളിതമായ സ്ക്രീൻ കളികൾ
For ages 3 and up, with an adult. Keep screen play brief and make time for active, off-screen play.|3 വയസ്സിന് മുകളിൽ, മുതിർന്നയാളോടൊപ്പം. സ്ക്രീൻ കളി കുറച്ചുനേരം മാത്രം; സ്ക്രീൻ ഇല്ലാതെയുള്ള സജീവ കളികൾക്കും സമയം നൽകുക.
These are play and learning activities, not a developmental test or treatment. Game results are not saved to your child’s records.|ഇവ കളിക്കും പഠനത്തിനുമുള്ള പ്രവർത്തനങ്ങളാണ്; വികാസപരിശോധനയോ ചികിത്സയോ അല്ല. കളിയുടെ ഫലങ്ങൾ കുട്ടിയുടെ രേഖകളിൽ സംരക്ഷിക്കില്ല.
Parent play and screen-time guidance|കളിയും സ്ക്രീൻ സമയവും സംബന്ധിച്ച രക്ഷിതൃ മാർഗനിർദ്ദേശങ്ങൾ
Circle|വൃത്തം
Square|ചതുരം
Triangle|ത്രികോണം
Star|നക്ഷത്രം
You finished this activity!|ഈ പ്രവർത്തനം പൂർത്തിയാക്കി!
Try some off-screen play together, or restart when you are ready.|ഒരുമിച്ച് സ്ക്രീൻ ഇല്ലാതെ കളിക്കാം; അല്ലെങ്കിൽ തയ്യാറാകുമ്പോൾ വീണ്ടും തുടങ്ങാം.
Pairs found|കണ്ടെത്തിയ ജോഡികൾ
Matching cards|ജോഡി കണ്ടെത്താനുള്ള കാർഡുകൾ
Card|കാർഡ്
Face down|മറച്ചുവെച്ചത്
Different shapes. Look at both, then try another pair.|വ്യത്യസ്ത ആകൃതികൾ. രണ്ടും നോക്കിയ ശേഷം മറ്റൊരു ജോഡി പരീക്ഷിക്കുക.
Choose two cards to find a pair.|ജോഡി കണ്ടെത്താൻ രണ്ട് കാർഡുകൾ തിരഞ്ഞെടുക്കുക.
Try another pair|മറ്റൊരു ജോഡി പരീക്ഷിക്കുക
Round|ഘട്ടം
Find this shape|ഈ ആകൃതി കണ്ടെത്തുക
What comes next?|അടുത്തത് ഏതാണ്?
Choose a shape|ഒരു ആകൃതി തിരഞ്ഞെടുക്കുക
You found it!|കണ്ടെത്തി!
Have another look. You can try again.|ഒരിക്കൽ കൂടി നോക്കാം. വീണ്ടും ശ്രമിക്കാം.
Finish activity|പ്രവർത്തനം പൂർത്തിയാക്കുക
Next round|അടുത്ത ഘട്ടം
Would you like an AI review of your child’s milestone answers?|കുട്ടിയുടെ നാഴികക്കല്ല് ഉത്തരങ്ങളുടെ AI അവലോകനം കാണാൻ താൽപര്യമുണ്ടോ?
Yes, show AI review|അതെ, AI അവലോകനം കാണിക്കുക
Not now|ഇപ്പോൾ വേണ്ട
Show AI review options|AI അവലോകനത്തിനുള്ള ഓപ്ഷനുകൾ കാണിക്കുക
AI review|AI അവലോകനം
Checklist-based follow-up guidance|പട്ടികയിലെ ഉത്തരങ്ങളെ അടിസ്ഥാനമാക്കിയുള്ള തുടർനടപടി നിർദേശം
Contact a clinician promptly|വൈകാതെ ഡോക്ടറെ ബന്ധപ്പെടുക
You reported a lost skill. Contact a qualified healthcare professional promptly; do not wait for another check-in or an AI reply.|മുമ്പുണ്ടായിരുന്ന ഒരു കഴിവ് നഷ്ടപ്പെട്ടതായി നിങ്ങൾ രേഖപ്പെടുത്തി. യോഗ്യതയുള്ള ആരോഗ്യവിദഗ്ധനെ വൈകാതെ ബന്ധപ്പെടുക; മറ്റൊരു ചെക്ക്-ഇനിനോ AI മറുപടിക്കോ കാത്തിരിക്കരുത്.
Arrange a developmental review|കുട്ടിയുടെ വികാസം വിലയിരുത്താൻ ഡോക്ടറെ കാണുക
Discuss your concerns and any emerging, unobserved or uncertain skills with a qualified healthcare professional. Ask whether a validated developmental screening or further evaluation is appropriate.|നിങ്ങളുടെ ആശങ്കകളും പുരോഗമിക്കുന്നതോ ഇനിയും കാണാത്തതോ ഉറപ്പില്ലാത്തതോ ആയ കഴിവുകളും യോഗ്യതയുള്ള ആരോഗ്യവിദഗ്ധനുമായി ചർച്ച ചെയ്യുക. സാധൂകരിച്ച വികാസ സ്ക്രീനിംഗോ കൂടുതൽ വിലയിരുത്തലോ ആവശ്യമുണ്ടോ എന്ന് ചോദിക്കുക.
Continue regular developmental checks|പതിവ് വികാസ പരിശോധനകൾ തുടരുക
Keep regular developmental appointments and discuss any new concerns with your clinician. Observing these skills does not rule out a developmental condition.|പതിവ് വികാസ പരിശോധനകൾ തുടരുകയും പുതിയ ആശങ്കകൾ ഡോക്ടറുമായി ചർച്ച ചെയ്യുകയും ചെയ്യുക. ഈ കഴിവുകൾ കണ്ടതുകൊണ്ട് മാത്രം വികാസവുമായി ബന്ധപ്പെട്ട അവസ്ഥ ഇല്ലെന്ന് ഉറപ്പിക്കാനാവില്ല.
Disorder probability|വികാസവുമായി ബന്ധപ്പെട്ട രോഗാവസ്ഥയുടെ സാധ്യത
Not estimated from milestone answers|നാഴികക്കല്ല് ഉത്തരങ്ങളെ അടിസ്ഥാനമാക്കി കണക്കാക്കിയിട്ടില്ല
Book a doctor’s appointment|ഡോക്ടറെ കാണാൻ സമയം ബുക്ക് ചെയ്യുക
Razorpay rejected the test credentials. Update the backend test key ID and secret.|Razorpay പരീക്ഷണ ക്രെഡൻഷ്യലുകൾ നിരസിച്ചു. ബാക്കെൻഡിലെ പരീക്ഷണ കീ ID-യും രഹസ്യ കീയും പുതുക്കുക.
Back to child profiles|കുട്ടികളുടെ പ്രൊഫൈലുകളിലേക്ക് മടങ്ങുക
Project payment demo|പ്രോജക്റ്റ് പണമടയ്ക്കൽ ഡെമോ
Razorpay test checkout|Razorpay പരീക്ഷണ പണമടയ്ക്കൽ
Try Razorpay test checkout|Razorpay പരീക്ഷണ പണമടയ്ക്കൽ തുറക്കുക
Try a ₹250 test payment for the project demo. No real money is charged, no appointment is booked, and no child records are shared.|പ്രോജക്റ്റ് ഡെമോയ്ക്കായി ₹250 പരീക്ഷണ പണമടയ്ക്കൽ നടത്താം. യഥാർഥ പണം ഈടാക്കില്ല, കൂടിക്കാഴ്ച ബുക്ക് ചെയ്യില്ല, കുട്ടിയുടെ രേഖകൾ പങ്കിടില്ല.
Test checkout is unavailable until Razorpay test credentials are configured.|Razorpay പരീക്ഷണ ക്രെഡൻഷ്യലുകൾ സജ്ജമാക്കുന്നതുവരെ പരീക്ഷണ പണമടയ്ക്കൽ ലഭ്യമല്ല.
Test order|പരീക്ഷണ ഓർഡർ
Test payment confirmed by Razorpay. No appointment was booked.|Razorpay പരീക്ഷണ പണമടയ്ക്കൽ സ്ഥിരീകരിച്ചു. കൂടിക്കാഴ്ച ബുക്ക് ചെയ്തിട്ടില്ല.
Test payment is pending. Check status before starting another test.|പരീക്ഷണ പണമടയ്ക്കൽ പൂർത്തിയായിട്ടില്ല. മറ്റൊന്ന് തുടങ്ങുന്നതിനുമുമ്പ് സ്ഥിതി പരിശോധിക്കുക.
Checkout closed. Check the test payment status before retrying.|പണമടയ്ക്കൽ വിൻഡോ അടച്ചു. വീണ്ടും ശ്രമിക്കുന്നതിന് മുമ്പ് പരീക്ഷണ പണമടയ്ക്കലിന്റെ സ്ഥിതി പരിശോധിക്കുക.
Test payment failed. You can check status or retry checkout.|പരീക്ഷണ പണമടയ്ക്കൽ പരാജയപ്പെട്ടു. സ്ഥിതി പരിശോധിക്കുകയോ വീണ്ടും ശ്രമിക്കുകയോ ചെയ്യാം.
Try ₹250 test payment|₹250 പരീക്ഷണ പണമടയ്ക്കൽ നടത്തുക
Reopen test checkout|പരീക്ഷണ പണമടയ്ക്കൽ വീണ്ടും തുറക്കുക
Check test payment status|പരീക്ഷണ പണമടയ്ക്കലിന്റെ സ്ഥിതി പരിശോധിക്കുക
Only Razorpay test keys are supported; real charges are disabled.|Razorpay പരീക്ഷണ കീകൾ മാത്രമേ പിന്തുണയ്ക്കൂ; യഥാർഥ പണമടയ്ക്കൽ ലഭ്യമല്ല.
Consultation fee (as provided)|നൽകിയ കൂടിക്കാഴ്ചാ ഫീസ്
Availability (as provided)|നൽകിയ ലഭ്യതാ വിവരങ്ങൾ
Razorpay payments|Razorpay പണമടയ്ക്കൽ
Specialist profile|വിദഗ്ധന്റെ വിവരങ്ങൾ
Qualifications (as provided)|നൽകിയ യോഗ്യതാ വിവരങ്ങൾ
Role|ചുമതല
Contact NIPMR|NIPMR-നെ ബന്ധപ്പെടുക
Contact NIPMR to confirm appointments, fees and availability. Booking through NeuroNest is not enabled for this profile.|കൂടിക്കാഴ്ച, ഫീസ്, ലഭ്യമായ സമയം എന്നിവ ഉറപ്പാക്കാൻ NIPMR-നെ ബന്ധപ്പെടുക. ഈ പ്രൊഫൈലിൽ NeuroNest വഴി ബുക്കിംഗ് ഇപ്പോൾ ലഭ്യമല്ല.
This resource is currently unavailable.|ഈ സ്രോതസ്സ് ഇപ്പോൾ ലഭ്യമല്ല.
Read resource|സ്രോതസ്സ് വായിക്കുക
Parent learning|രക്ഷിതാക്കൾക്കുള്ള അറിവ്
Understanding neurodevelopment|നാഡീവികാസത്തെ മനസ്സിലാക്കാം
Learn about child development, developmental differences and available support.|കുട്ടികളുടെ വികാസം, വികാസ വ്യത്യാസങ്ങൾ, ലഭ്യമായ പിന്തുണ എന്നിവയെക്കുറിച്ച് അറിയാം.
Ten topics for parents and caregivers. Search links open YouTube results, not a selected or reviewed video. Resources may be in English.|രക്ഷിതാക്കൾക്കും പരിചരിക്കുന്നവർക്കുമായി പത്ത് വിഷയങ്ങൾ. തിരച്ചിൽ ലിങ്കുകൾ YouTube ഫലങ്ങൾ തുറക്കും; തിരഞ്ഞെടുത്തതോ പരിശോധിച്ചതോ ആയ ഒറ്റ വീഡിയോ അല്ല. സ്രോതസ്സുകൾ ഇംഗ്ലീഷിലായിരിക്കാം.
For learning, not diagnosis. Discuss developmental concerns with a qualified healthcare professional.|പഠനത്തിനുള്ള സഹായം മാത്രം; രോഗനിർണയമല്ല. വികാസത്തെക്കുറിച്ചുള്ള ആശങ്കകൾ യോഗ്യതയുള്ള ആരോഗ്യവിദഗ്ധനുമായി ചർച്ച ചെയ്യുക.
No matching topics|പൊരുത്തപ്പെടുന്ന വിഷയങ്ങളില്ല
Topics|വിഷയങ്ങൾ
Find videos|വീഡിയോകൾ തിരയുക
Browse videos|വീഡിയോകൾ കാണുക
Watch video|വീഡിയോ കാണുക
Video collection|വീഡിയോ ശേഖരം
Video preview unavailable|വീഡിയോയുടെ പ്രിവ്യൂ ലഭ്യമല്ല
Close video|വീഡിയോ അടയ്ക്കുക
Open on YouTube|YouTube-ൽ തുറക്കുക
opens in a new tab|പുതിയ ടാബിൽ തുറക്കും
View all|എല്ലാം കാണുക
Back to Home|ഹോമിലേക്ക് മടങ്ങുക
Keep a note of a new skill, a change, or a concern.|ഒരു പുതിയ കഴിവോ മാറ്റമോ ആശങ്കയോ കുറിച്ചുവയ്ക്കൂ.
Add observation|നിരീക്ഷണം ചേർക്കുക
Next appointment|അടുത്ത കൂടിക്കാഴ്ച
No upcoming appointments.|വരാനിരിക്കുന്ന കൂടിക്കാഴ്ചകളില്ല.
Recent notes|സമീപകാല കുറിപ്പുകൾ
No observations yet. Your notes will appear here.|ഇതുവരെ നിരീക്ഷണങ്ങളില്ല. നിങ്ങളുടെ കുറിപ്പുകൾ ഇവിടെ കാണാം.
Add your child’s profile to start recording observations and planning care.|നിരീക്ഷണങ്ങൾ രേഖപ്പെടുത്താനും പരിചരണം ആസൂത്രണം ചെയ്യാനും കുട്ടിയുടെ പ്രൊഫൈൽ ചേർക്കുക.
All selected skills reported as observed|തിരഞ്ഞെടുത്ത എല്ലാ കഴിവുകളും കണ്ടതായി രേഖപ്പെടുത്തി
Some skills are not yet observed|ചില കഴിവുകൾ ഇനിയും കണ്ടിട്ടില്ല
Some answers describe emerging or uncertain skills|ചില ഉത്തരങ്ങൾ പുരോഗമിക്കുന്നതോ ഉറപ്പില്ലാത്തതോ ആയ കഴിവുകളെ സൂചിപ്പിക്കുന്നു
AI-assisted checklist review for the project demo. This describes reported answers, not a validated screening result or diagnosis.|AI സഹായത്തോടെയുള്ള പ്രോജക്ട് ഡെമോ പരിശോധന മാത്രം. രേഖപ്പെടുത്തിയ ഉത്തരങ്ങളുടെ സംഗ്രഹമാണിത്; സാധൂകരിച്ച സ്ക്രീനിംഗോ രോഗനിർണയമോ അല്ല.
Loading page shortcuts…|വിഭാഗങ്ങൾ ലഭ്യമാക്കുന്നു…
Your guide to NeuroNest|NeuroNest ഉപയോഗിക്കാൻ സഹായം
What would you like to do?|എന്താണ് ചെയ്യേണ്ടത്?
Tell me what you need. I’ll help you find the right place.|എന്താണ് വേണ്ടതെന്ന് പറയൂ. ശരിയായ വിഭാഗം കണ്ടെത്താൻ സഹായിക്കാം.
Browse all sections|എല്ലാ വിഭാഗങ്ങളും കാണുക
Where would you like to go?|ഏത് വിഭാഗമാണ് വേണ്ടത്?
Back to conversation|സംഭാഷണത്തിലേക്ക് മടങ്ങുക
Finding the right place…|ശരിയായ വിഭാഗം കണ്ടെത്തുന്നു…
Ask me where to find something…|ആവശ്യമുള്ളത് എവിടെയാണെന്ന് ചോദിക്കൂ…
Your message helps find a page. Child records are not included.|പേജ് കണ്ടെത്താനാണ് നിങ്ങളുടെ സന്ദേശം ഉപയോഗിക്കുന്നത്. കുട്ടിയുടെ രേഖകൾ ഉൾപ്പെടുന്നില്ല.
Tell me what you want to do, and I’ll help you find it.|എന്താണ് ചെയ്യേണ്ടതെന്ന് പറയൂ. അതിനുള്ള വിഭാഗം കണ്ടെത്താൻ സഹായിക്കാം.
I couldn’t find a page just now. Try a shortcut below or ask again.|ഇപ്പോൾ പേജ് കണ്ടെത്താനായില്ല. താഴെയുള്ള വിഭാഗങ്ങൾ ഉപയോഗിക്കുക അല്ലെങ്കിൽ വീണ്ടും ചോദിക്കുക.
Page shortcuts couldn’t load. You can still ask for help.|വിഭാഗങ്ങൾ ലഭ്യമാക്കാനായില്ല. സഹായം ചോദിക്കാം.
You’re offline. Saved shortcuts still work; send your message when reconnected.|ഇന്റർനെറ്റ് ബന്ധമില്ല. ലഭ്യമായ വിഭാഗങ്ങൾ തുറക്കാം; ബന്ധം ലഭിച്ചാൽ സന്ദേശം അയയ്ക്കാം.
Conversation|സംഭാഷണം
You|നിങ്ങൾ
AI explanation|AI വിശദീകരണം
Only checklist questions and answers are shared with the AI service. Names and medical records are excluded.|ചെക്ക്ലിസ്റ്റ് ചോദ്യങ്ങളും ഉത്തരങ്ങളും മാത്രം AI സേവനവുമായി പങ്കിടുന്നു. പേരുകളും മെഡിക്കൽ രേഖകളും ഉൾപ്പെടില്ല.
The AI service is awaiting provider activation. Your saved summary is still available.|AI സേവനം പ്രവർത്തനക്ഷമമാക്കുന്നതിനുള്ള നടപടി പൂർത്തിയായിട്ടില്ല. സൂക്ഷിച്ച സംഗ്രഹം തുടർന്നും ലഭ്യമാണ്.
AI service credits are unavailable. Your saved summary is still available.|AI സേവനത്തിനുള്ള ക്രെഡിറ്റുകൾ ലഭ്യമല്ല. സൂക്ഷിച്ച സംഗ്രഹം തുടർന്നും ലഭ്യമാണ്.
AI could not provide a verified explanation. Your saved summary is still available.|പരിശോധിച്ചുറപ്പിച്ച AI വിശദീകരണം ലഭിച്ചില്ല. സൂക്ഷിച്ച സംഗ്രഹം തുടർന്നും ലഭ്യമാണ്.
AI-generated explanation of parent observations for the project demo. This is not a validated screening result or diagnosis.|പ്രോജക്ട് ഡെമോയ്ക്കായി മാതാപിതാക്കളുടെ നിരീക്ഷണങ്ങൾക്ക് AI തയ്യാറാക്കിയ വിശദീകരണം. ഇത് സാധൂകരിച്ച സ്ക്രീനിംഗ് ഫലമോ രോഗനിർണയമോ അല്ല.
AI explanation is unavailable. Your saved summary is still available.|AI വിശദീകരണം ഇപ്പോൾ ലഭ്യമല്ല. സൂക്ഷിച്ച സംഗ്രഹം തുടർന്നും ലഭ്യമാണ്.
Age at check-in|രേഖപ്പെടുത്തുമ്പോഴുള്ള പ്രായം
Checklist by age|ഈ പ്രായത്തിനുള്ള പട്ടിക
Developmental questions|വികാസത്തെക്കുറിച്ചുള്ള ചോദ്യങ്ങൾ
Explain these answers with AI|ഈ ഉത്തരങ്ങൾക്ക് AI വിശദീകരണം നൽകുക
Loading age-based questions…|പ്രായത്തിനനുസരിച്ചുള്ള ചോദ്യങ്ങൾ ലഭ്യമാക്കുന്നു…
Reload checklist|പട്ടിക വീണ്ടും ലഭ്യമാക്കുക
Submit check-in|ഉത്തരങ്ങൾ സമർപ്പിക്കുക
Unable to save. Please try again.|സൂക്ഷിക്കാനായില്ല. വീണ്ടും ശ്രമിക്കുക.
View age reference|ഈ പ്രായത്തിനുള്ള ഉറവിടം കാണുക
View summary|സംഗ്രഹം കാണുക
Working…|പ്രവർത്തിക്കുന്നു…
completed months|പൂർത്തിയായ മാസം
month checklist|മാസത്തിനുള്ള പട്ടിക
months|മാസം
questions answered|ചോദ്യങ്ങൾക്ക് ഉത്തരം നൽകി
Age-based developmental check-in|പ്രായത്തിനനുസരിച്ചുള്ള വികാസ രേഖപ്പെടുത്തൽ
Research age context|ഗവേഷണത്തിലെ പ്രായസംബന്ധമായ വിവരങ്ങൾ
View report|റിപ്പോർട്ട് കാണുക
Saved developmental check-ins|സൂക്ഷിച്ച വികാസ രേഖപ്പെടുത്തലുകൾ
Parent-reported answers in the selected period.|തിരഞ്ഞെടുത്ത കാലയളവിൽ രക്ഷിതാവ് നൽകിയ ഉത്തരങ്ങൾ.
Milestone check-ins|നാഴികക്കല്ല് രേഖപ്പെടുത്തലുകൾ
Parent questionnaires|രക്ഷിതൃ ചോദ്യാവലികൾ
No milestone check-ins recorded in this period.|ഈ കാലയളവിൽ നാഴികക്കല്ല് രേഖപ്പെടുത്തലുകളില്ല.
Review milestone check-ins|നാഴികക്കല്ല് രേഖപ്പെടുത്തലുകൾ പരിശോധിക്കുക
Review parent questionnaires|രക്ഷിതൃ ചോദ്യാവലികൾ പരിശോധിക്കുക
These estimates describe related tasks in a historical Netherlands study. They are not predictions about your child, Indian norms, or scores for your answers. The research tasks differ from this checklist.|ഈ കണക്കുകൾ നെതർലൻഡ്സിൽ മുമ്പ് നടത്തിയ പഠനത്തിലെ ബന്ധപ്പെട്ട പ്രവർത്തനങ്ങളെ വിവരിക്കുന്നു. ഇവ നിങ്ങളുടെ കുട്ടിയെക്കുറിച്ചുള്ള പ്രവചനങ്ങളോ ഇന്ത്യൻ മാനദണ്ഡങ്ങളോ നിങ്ങളുടെ ഉത്തരങ്ങളുടെ സ്കോറോ അല്ല. പഠനത്തിലെ പ്രവർത്തനങ്ങൾ ഈ പട്ടികയിൽനിന്ന് വ്യത്യസ്തമാണ്.
Fewer than 5 in 100|100-ൽ 5-ൽ താഴെ
More than 95 in 100|100-ൽ 95-ൽ കൂടുതൽ
About|ഏകദേശം
in 100|പേർ, 100-ൽ
Estimated to perform the research task at this age.|ഈ പ്രായത്തിൽ പഠനത്തിലെ പ്രവർത്തനം ചെയ്യുമെന്ന് കണക്കാക്കുന്ന അനുപാതം.
checklist items have related age data. Unmatched items are not estimated.|ചോദ്യങ്ങൾക്ക് ബന്ധപ്പെട്ട പ്രായവിവരങ്ങൾ ലഭ്യമാണ്. പൊരുത്തമില്ലാത്തവയ്ക്ക് കണക്കുകൾ നൽകുന്നില്ല.
The available research does not support an estimate for these tasks at this age. Your saved answers remain available above.|ഈ പ്രായത്തിലെ ഈ പ്രവർത്തനങ്ങൾക്ക് കണക്കുകൾ നൽകാൻ ലഭ്യമായ ഗവേഷണം പര്യാപ്തമല്ല. സൂക്ഷിച്ച നിങ്ങളുടെ ഉത്തരങ്ങൾ മുകളിൽ ലഭ്യമാണ്.
Research source|ഗവേഷണ ഉറവിടം
Age estimates adapted by NeuroNest.|പ്രായസംബന്ധമായ കണക്കുകൾ NeuroNest തയ്യാറാക്കിയത്.
Answer using what you have noticed. In progress means the skill is emerging; Not sure is also a valid answer.|നിങ്ങൾ ശ്രദ്ധിച്ച കാര്യങ്ങളെ അടിസ്ഥാനമാക്കി ഉത്തരം നൽകുക. പുരോഗമിക്കുന്നു എന്നത് കഴിവ് വികസിച്ചുവരുന്നതാണ്; ഉറപ്പില്ല എന്നതും സാധുവായ ഉത്തരമാണ്.
We use the latest checklist age your child has reached, not the next age. If your child was born early, ask your clinician which age to use.|കുട്ടി പൂർത്തിയാക്കിയ ഏറ്റവും അടുത്ത പ്രായത്തിനുള്ള പട്ടികയാണ് ഉപയോഗിക്കുന്നത്. മാസം തികയാതെ ജനിച്ച കുട്ടിക്ക് ഏത് പ്രായം ഉപയോഗിക്കണമെന്ന് ഡോക്ടറോട് ചോദിക്കുക.
Do you have any concerns about your child’s development?|കുട്ടിയുടെ വികാസത്തെക്കുറിച്ച് നിങ്ങൾക്ക് എന്തെങ്കിലും ആശങ്കയുണ്ടോ?
Has your child lost a skill they used to have?|മുമ്പുണ്ടായിരുന്ന ഒരു കഴിവ് കുട്ടിക്ക് നഷ്ടപ്പെട്ടിട്ടുണ്ടോ?
Contact a qualified healthcare professional promptly about a lost skill. Do not wait for this check-in or an AI reply.|നഷ്ടപ്പെട്ട കഴിവിനെക്കുറിച്ച് യോഗ്യതയുള്ള ആരോഗ്യവിദഗ്ധനുമായി ഉടൻ സംസാരിക്കുക. ഈ രേഖപ്പെടുത്തലിനോ AI മറുപടിക്കോ കാത്തിരിക്കരുത്.
Parents complete this check-in. Authorized care professionals can review saved responses below.|രക്ഷിതാക്കളാണ് ഈ ഉത്തരങ്ങൾ നൽകുന്നത്. അനുമതിയുള്ള പരിചരണ വിദഗ്ധർക്ക് സൂക്ഷിച്ച ഉത്തരങ്ങൾ താഴെ കാണാം.
Selected prompts adapted from CDC milestone guidance; this is not the complete CDC checklist.|CDC നാഴികക്കല്ല് മാർഗനിർദ്ദേശങ്ങളിൽനിന്ന് തിരഞ്ഞെടുത്ത ചോദ്യങ്ങളാണിവ; പൂർണ്ണമായ CDC പട്ടികയല്ല.
These checklists cover ages 2 to 71 completed months. Discuss developmental questions with your clinician at any age.|ഈ പട്ടികകൾ 2 മുതൽ 71 വരെ പൂർത്തിയായ മാസങ്ങൾക്കുള്ളതാണ്. ഏത് പ്രായത്തിലും വികാസത്തെക്കുറിച്ചുള്ള സംശയങ്ങൾ ഡോക്ടറുമായി ചർച്ച ചെയ്യുക.
This is developmental monitoring, not a validated screening test or diagnosis. It cannot confirm typical development or predict a disorder.|ഇത് വികാസം നിരീക്ഷിക്കാനുള്ള സഹായമാണ്; സാധുത പരിശോധിച്ച സ്ക്രീനിംഗ് പരിശോധനയോ രോഗനിർണയമോ അല്ല. സാധാരണ വികാസം ഉറപ്പാക്കാനോ ഒരു തകരാർ പ്രവചിക്കാനോ ഇതിന് കഴിയില്ല.
Your developmental observations|നിങ്ങൾ രേഖപ്പെടുത്തിയ വികാസ നിരീക്ഷണങ്ങൾ
Discuss these observations with your clinician|ഈ നിരീക്ഷണങ്ങൾ ഡോക്ടറുമായി ചർച്ച ചെയ്യുക
All listed skills reported as achieved|പട്ടികയിലെ എല്ലാ കഴിവുകളും കൈവരിച്ചതായി രേഖപ്പെടുത്തി
Share skills marked In progress, Not yet or Not sure, and any concerns, with a qualified healthcare professional. Ask whether a validated developmental screening or further evaluation is appropriate.|പുരോഗമിക്കുന്നു, ഇതുവരെയില്ല, ഉറപ്പില്ല എന്ന് രേഖപ്പെടുത്തിയ കഴിവുകളും ആശങ്കകളും യോഗ്യതയുള്ള ആരോഗ്യവിദഗ്ധനുമായി പങ്കിടുക. സാധുത പരിശോധിച്ച സ്ക്രീനിംഗോ കൂടുതൽ വിലയിരുത്തലോ ആവശ്യമാണോ എന്ന് ചോദിക്കുക.
Your answers report the selected skills as achieved. This short checklist cannot confirm typical development or rule out a concern. Continue regular developmental reviews and raise any concerns with your clinician.|തിരഞ്ഞെടുത്ത കഴിവുകൾ കൈവരിച്ചതായി നിങ്ങളുടെ ഉത്തരങ്ങൾ പറയുന്നു. ഈ ചെറിയ പട്ടികയ്ക്ക് സാധാരണ വികാസം ഉറപ്പാക്കാനോ ആശങ്ക തള്ളിക്കളയാനോ കഴിയില്ല. പതിവ് വികാസ പരിശോധനകൾ തുടരുകയും ആശങ്കകൾ ഡോക്ടറുമായി പങ്കിടുകയും ചെയ്യുക.
Based on saved parent responses. No disorder probability or clinical score is calculated.|സൂക്ഷിച്ച രക്ഷിതൃ ഉത്തരങ്ങളെ അടിസ്ഥാനമാക്കിയുള്ളതാണ്. രോഗസാധ്യതയോ ക്ലിനിക്കൽ സ്കോറോ കണക്കാക്കുന്നില്ല.
I agree to share this saved check-in with the configured AI service for an explanation.|വിശദീകരണത്തിനായി സൂക്ഷിച്ച ഈ ഉത്തരങ്ങൾ സജ്ജീകരിച്ച AI സേവനവുമായി പങ്കിടാൻ ഞാൻ സമ്മതിക്കുന്നു.
AI explanations are not enabled. The saved summary above is based only on your responses.|AI വിശദീകരണം പ്രവർത്തനക്ഷമമാക്കിയിട്ടില്ല. മുകളിലെ സംഗ്രഹം നിങ്ങളുടെ ഉത്തരങ്ങളെ മാത്രം അടിസ്ഥാനമാക്കിയുള്ളതാണ്.
Saved milestone check-ins|സൂക്ഷിച്ച നാഴികക്കല്ല് രേഖപ്പെടുത്തലുകൾ
In progress|പുരോഗമിക്കുന്നു
Not yet|ഇതുവരെയില്ല
Not sure|ഉറപ്പില്ല
movement|ചലന കഴിവുകൾ
cognitive|പഠനവും ചിന്തയും
daily_living|ദൈനംദിന കഴിവുകൾ
Care professionals|പരിചരണ വിദഗ്ധർ
Loading available times…|ലഭ്യമായ സമയങ്ങൾ ലഭ്യമാക്കുന്നു…
Plan a visit, stay in touch, and manage the next steps in one place.|കൂടിക്കാഴ്ച ആസൂത്രണം ചെയ്യാനും ബന്ധപ്പെടാനും തുടർനടപടികൾ കൈകാര്യം ചെയ്യാനുമുള്ള ഒരിടം.
Test profile|പരിശോധനാ പ്രൊഫൈൽ
Exhibition mode|പ്രദർശന മോഡ്
Fictional booking profiles · Test payments|സാങ്കൽപ്പിക ബുക്കിംഗ് പ്രൊഫൈലുകൾ · പരീക്ഷണ പേയ്‌മെന്റുകൾ
Appointment availability|അപ്പോയിന്റ്മെന്റ് സമയങ്ങൾ
Monday–Friday, 10:30 am–3 pm IST. Lunch: 12:30–1:30 pm. 30-minute visits.|തിങ്കൾ–വെള്ളി, രാവിലെ 10:30–വൈകിട്ട് 3 വരെ (IST). ഉച്ചഭക്ഷണ ഇടവേള: 12:30–1:30. ഓരോ സന്ദർശനവും 30 മിനിറ്റ്.
Test profile — no clinical service|പരിശോധനാ പ്രൊഫൈൽ — ക്ലിനിക്കൽ സേവനമില്ല
Therapy & home practice|തെറാപ്പിയും വീട്ടിലെ പരിശീലനവും
Your care, together|ഒരുമിച്ചുള്ള പരിചരണം
Booking payments are not available yet. No reservation has been created. Please try again after payment setup is complete.|ബുക്കിംഗ് പേയ്മെന്റ് ഇപ്പോൾ ലഭ്യമല്ല. ഒരു സമയവും സംവരണം ചെയ്തിട്ടില്ല. പേയ്മെന്റ് ക്രമീകരണം പൂർത്തിയായശേഷം വീണ്ടും ശ്രമിക്കുക.
Answer questions for your child’s age and review your saved observations.|കുട്ടിയുടെ പ്രായത്തിനനുസരിച്ചുള്ള ചോദ്യങ്ങൾക്ക് ഉത്തരം നൽകുകയും സൂക്ഷിച്ച നിരീക്ഷണങ്ങൾ പരിശോധിക്കുകയും ചെയ്യുക.
Doctor appointments|ഡോക്ടറുടെ അപ്പോയിന്റ്മെന്റുകൾ
Book an online consultation or an in-person clinic visit.|ഓൺലൈൻ കൺസൾട്ടേഷനോ ക്ലിനിക്കിലെ നേരിട്ടുള്ള കൂടിക്കാഴ്ചയോ ബുക്ക് ചെയ്യുക.
Book an appointment|ഒരു കൂടിക്കാഴ്ച ബുക്ക് ചെയ്യുക
Appointment tools|അപ്പോയിന്റ്മെന്റ് ഉപകരണങ്ങൾ
Your appointments|നിങ്ങളുടെ കൂടിക്കാഴ്ചകൾ
Upcoming appointments|വരാനിരിക്കുന്ന കൂടിക്കാഴ്ചകൾ
View all appointments|എല്ലാ കൂടിക്കാഴ്ചകളും കാണുക
In-person appointment|നേരിട്ടുള്ള കൂടിക്കാഴ്ച
Consultation type|കൺസൾട്ടേഷന്റെ രീതി
Clinic address|ക്ലിനിക്കിന്റെ വിലാസം
Clinic address (required for in-person visits)|ക്ലിനിക്കിന്റെ വിലാസം (നേരിട്ടുള്ള കൂടിക്കാഴ്ചയ്ക്ക് നിർബന്ധം)
Join online visit|ഓൺലൈൻ കൂടിക്കാഴ്ചയിൽ ചേരുക
Online video visits are currently unavailable.|ഓൺലൈൻ വീഡിയോ കൂടിക്കാഴ്ചകൾ ഇപ്പോൾ ലഭ്യമല്ല.
Test consultation only — no medical service.|പരിശോധനയ്ക്കുള്ള കൺസൾട്ടേഷൻ മാത്രം — ചികിത്സാ സേവനമില്ല.
Test payments only. No live payment service is enabled.|പരിശോധനയ്ക്കുള്ള പേയ്മെന്റുകൾ മാത്രം. യഥാർത്ഥ പണമിടപാട് പ്രവർത്തനക്ഷമമാക്കിയിട്ടില്ല.
Appointment payments are currently unavailable. You can still browse doctors and review existing appointments.|കൂടിക്കാഴ്ചയ്ക്കുള്ള പേയ്മെന്റുകൾ ഇപ്പോൾ ലഭ്യമല്ല. ഡോക്ടർമാരെയും നിലവിലെ കൂടിക്കാഴ്ചകളെയും തുടർന്നും കാണാം.
Payments are securely confirmed by the payment provider.|പേയ്മെന്റ് സേവനദാതാവാണ് പണമടച്ചത് സുരക്ഷിതമായി സ്ഥിരീകരിക്കുന്നത്.
Care|പരിചരണം
Your care workspace|നിങ്ങളുടെ പരിചരണ ഇടം
Username or email|യൂസർനെയിം അല്ലെങ്കിൽ ഇമെയിൽ
Sign in with your username or email address.|യൂസർനെയിം അല്ലെങ്കിൽ ഇമെയിൽ വിലാസം ഉപയോഗിച്ച് പ്രവേശിക്കുക.
I’ve verified my email — continue|ഇമെയിൽ സ്ഥിരീകരിച്ചു — തുടരുക
Open the link in your email, then return here and continue with your password.|ഇമെയിലിലെ ലിങ്ക് തുറന്ന് സ്ഥിരീകരിച്ച ശേഷം ഇവിടെ തിരിച്ചെത്തി പാസ്‌വേഡ് ഉപയോഗിച്ച് തുടരുക.
Enter your email and password to resend the verification link.|സ്ഥിരീകരണ ലിങ്ക് വീണ്ടും അയയ്ക്കാൻ ഇമെയിലും പാസ്‌വേഡും നൽകുക.
We couldn’t send the verification email. Please try again.|സ്ഥിരീകരണ ഇമെയിൽ അയയ്ക്കാനായില്ല. വീണ്ടും ശ്രമിക്കുക.
We couldn’t save your username. Choose another or try again.|യൂസർനെയിം സേവ് ചെയ്യാനായില്ല. മറ്റൊന്ന് തിരഞ്ഞെടുക്കുക അല്ലെങ്കിൽ വീണ്ടും ശ്രമിക്കുക.
Your account was created, but the verification email could not be sent. Use the resend button below.|അക്കൗണ്ട് സൃഷ്ടിച്ചു. എന്നാൽ സ്ഥിരീകരണ ഇമെയിൽ അയയ്ക്കാനായില്ല. താഴെയുള്ള വീണ്ടും അയയ്ക്കുക ബട്ടൺ ഉപയോഗിക്കുക.
Care, with you at the center.|നിങ്ങളെ കേന്ദ്രീകരിച്ച പരിചരണം.
A little understanding goes a long way.|ചെറിയ അറിവ് വലിയ പിന്തുണയാകുന്നു.
Your story, kept together.|നിങ്ങളുടെ വിവരങ്ങൾ ഒരിടത്ത്.
A clearer picture, built from your records.|നിങ്ങളുടെ രേഖകളിൽ നിന്ന് രൂപപ്പെട്ട വ്യക്തമായ ചിത്രം.
A little guidance, whenever you need.|ആവശ്യമായപ്പോൾ ഒരു മാർഗനിർദേശം.
Care activity report|പരിചരണ പ്രവർത്തന റിപ്പോർട്ട്
Care report|പരിചരണ റിപ്പോർട്ട്
A clear view of recorded moments, goals, and care activity. It does not diagnose autism or create an AI score.|രേഖപ്പെടുത്തിയ നിമിഷങ്ങൾ, ലക്ഷ്യങ്ങൾ, പരിചരണ പ്രവർത്തനങ്ങൾ എന്നിവയുടെ വ്യക്തമായ കാഴ്ച. ഇത് ഓട്ടിസം രോഗനിർണയമോ എഐ സ്കോറോ സൃഷ്ടിക്കുന്നില്ല.
Report period|റിപ്പോർട്ട് കാലയളവ്
30 days|30 ദിവസം
90 days|90 ദിവസം
All recorded|രേഖപ്പെടുത്തിയ എല്ലാം
Observations|നിരീക്ഷണങ്ങൾ
Therapy sessions|തെറാപ്പി സെഷനുകൾ
observations recorded|രേഖപ്പെടുത്തിയ നിരീക്ഷണങ്ങൾ
all recorded activity|രേഖപ്പെടുത്തിയ എല്ലാ പ്രവർത്തനങ്ങളും
in the last|കഴിഞ്ഞ
goals reached|കൈവരിച്ച ലക്ഷ്യങ്ങൾ
recorded achievements|രേഖപ്പെടുത്തിയ നേട്ടങ്ങൾ
therapy sessions completed|പൂർത്തിയാക്കിയ തെറാപ്പി സെഷനുകൾ
completed sessions only|പൂർത്തിയാക്കിയ സെഷനുകൾ മാത്രം
appointments completed|പൂർത്തിയാക്കിയ കൂടിക്കാഴ്ചകൾ
completed visits only|പൂർത്തിയാക്കിയ സന്ദർശനങ്ങൾ മാത്രം
Care activity over time|കാലക്രമത്തിലുള്ള പരിചരണ പ്രവർത്തനം
Only completed care and parent-recorded observations are counted.|പൂർത്തിയാക്കിയ പരിചരണ പ്രവർത്തനങ്ങളും രക്ഷിതാവ് രേഖപ്പെടുത്തിയ നിരീക്ഷണങ്ങളും മാത്രം കണക്കാക്കുന്നു.
Activity chart legend|പ്രവർത്തന ചാർട്ടിന്റെ വിശദീകരണം
Care activity for|ഇതിനുള്ള പരിചരണ പ്രവർത്തനം
No recorded care activity in this period yet.|ഈ കാലയളവിൽ രേഖപ്പെടുത്തിയ പരിചരണ പ്രവർത്തനങ്ങളില്ല.
Goal progress|ലക്ഷ്യങ്ങളുടെ പുരോഗതി
Personal goals, with no comparison or ranking.|താരതമ്യമോ റാങ്കിംഗോ ഇല്ലാത്ത വ്യക്തിഗത ലക്ഷ്യങ്ങൾ.
Active|സജീവം
Achieved|കൈവരിച്ചു
Paused|താൽക്കാലികമായി നിർത്തി
Created|തുടങ്ങി
Incomplete|പൂർത്തിയാകാത്തത്
Follow up required|തുടർപരിശോധന ആവശ്യമാണ്
Completed|പൂർത്തിയായി
Reviewed|പരിശോധിച്ചു
Clinician reviewed|വിദഗ്ധൻ പരിശോധിച്ചു
Unavailable|ലഭ്യമല്ല
and|കൂടാതെ
goals|ലക്ഷ്യങ്ങൾ
No personal goals recorded yet.|വ്യക്തിഗത ലക്ഷ്യങ്ങൾ ഇതുവരെ രേഖപ്പെടുത്തിയിട്ടില്ല.
What has been noticed|ശ്രദ്ധിച്ച കാര്യങ്ങൾ
Parent-recorded observations by area.|മേഖല അനുസരിച്ച് രക്ഷിതാവ് രേഖപ്പെടുത്തിയ നിരീക്ഷണങ്ങൾ.
No observations recorded in this period yet.|ഈ കാലയളവിൽ നിരീക്ഷണങ്ങളൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല.
Screening workflows|പ്രാഥമിക പരിശോധന പ്രവാഹങ്ങൾ
Saved workflow statuses only; no score or diagnosis is shown.|സൂക്ഷിച്ച പ്രവാഹ നിലകൾ മാത്രം; സ്കോറോ രോഗനിർണയമോ കാണിക്കില്ല.
No screening workflows recorded in this period.|ഈ കാലയളവിൽ പ്രാഥമിക പരിശോധന പ്രവാഹങ്ങളൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല.
Recorded growth|രേഖപ്പെടുത്തിയ വളർച്ച
Chronological measurements only; no percentiles or interpretation.|കാലക്രമത്തിലുള്ള അളവുകൾ മാത്രം; പെർസെന്റൈലുകളോ വ്യാഖ്യാനമോ ഇല്ല.
Latest measurement|ഏറ്റവും പുതിയ അളവ്
Weight|ഭാരം
Height|ഉയരം
Measurements recorded|രേഖപ്പെടുത്തിയ അളവുകൾ
No growth measurements recorded yet.|വളർച്ചാ അളവുകൾ ഇതുവരെ രേഖപ്പെടുത്തിയിട്ടില്ല.
Not recorded|രേഖപ്പെടുത്തിയിട്ടില്ല
Report scope|റിപ്പോർട്ടിന്റെ പരിധി
About this report|ഈ റിപ്പോർട്ടിനെക്കുറിച്ച്
This view combines records already in your care workspace. It is not a clinical report, diagnosis, prediction, or risk assessment.|നിങ്ങളുടെ പരിചരണ ഇടത്തിലെ നിലവിലുള്ള രേഖകളാണ് ഈ കാഴ്ച ഒരുമിപ്പിക്കുന്നത്. ഇത് ക്ലിനിക്കൽ റിപ്പോർട്ടോ രോഗനിർണയമോ പ്രവചനമോ അപകടസാധ്യതാ വിലയിരുത്തലോ അല്ല.
Nest Assistant can explain selected records only after you explicitly confirm the request.|നിങ്ങൾ അഭ്യർത്ഥന വ്യക്തമായി സ്ഥിരീകരിച്ചതിന് ശേഷമേ നെസ്റ്റ് അസിസ്റ്റന്റിന് തിരഞ്ഞെടുത്ത രേഖകൾ വിശദീകരിക്കാൻ കഴിയൂ.
AI record insights are paused. The charts use only the information you have saved.|എഐ രേഖാ ഉൾക്കാഴ്ചകൾ താൽക്കാലികമായി നിർത്തിയിരിക്കുന്നു. ചാർട്ടുകൾ നിങ്ങൾ സൂക്ഷിച്ച വിവരങ്ങൾ മാത്രം ഉപയോഗിക്കുന്നു.
Screening workflows are configured separately and remain subject to clinical review.|പ്രാഥമിക പരിശോധന പ്രവാഹങ്ങൾ പ്രത്യേകം ക്രമീകരിച്ചവയാണ്; അവ ക്ലിനിക്കൽ പരിശോധനയ്ക്ക് വിധേയമാണ്.
Screening workflow availability is configured separately; saved statuses remain distinct from clinical review.|പ്രാഥമിക പരിശോധന പ്രവാഹത്തിന്റെ ലഭ്യത പ്രത്യേകം ക്രമീകരിക്കപ്പെടുന്നു; സൂക്ഷിച്ച നിലകൾ ക്ലിനിക്കൽ പരിശോധനയിൽ നിന്ന് വ്യത്യസ്തമാണ്.
This report shows the latest loaded records; older entries may not be included.|ഈ റിപ്പോർട്ട് അവസാനം ലോഡ് ചെയ്ത രേഖകളാണ് കാണിക്കുന്നത്; പഴയ വിവരങ്ങൾ ഉൾപ്പെട്ടിരിക്കണമെന്നില്ല.
Loading report data…|റിപ്പോർട്ട് വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു…
Some report data is unavailable|ചില റിപ്പോർട്ട് വിവരങ്ങൾ ലഭ്യമല്ല
The unavailable areas are not counted in the charts below.|ലഭ്യമല്ലാത്ത മേഖലകൾ താഴെയുള്ള ചാർട്ടുകളിൽ ഉൾപ്പെടുത്തിയിട്ടില്ല.
Retry report|റിപ്പോർട്ട് വീണ്ടും ശ്രമിക്കുക
Other|മറ്റുള്ളവ
Small moments. Steady support. A journey that’s entirely your own.|ചെറിയ നിമിഷങ്ങൾ. സ്ഥിരമായ പിന്തുണ. നിങ്ങളുടെ സ്വന്തം യാത്ര.
Notice the moments. Celebrate the progress. Follow your child’s own rhythm.|നിമിഷങ്ങൾ ശ്രദ്ധിക്കുക. പുരോഗതി ആഘോഷിക്കുക. കുട്ടിയുടെ സ്വന്തം താളം പിന്തുടരുക.
Find your people, make a plan, and take the next step together.|പിന്തുണ കണ്ടെത്തുക, ആസൂത്രണം ചെയ്യുക, ഒരുമിച്ച് മുന്നോട്ട് പോകുക.
Manage records and decide who can see them. You stay in control.|രേഖകൾ നിയന്ത്രിക്കുക; അവ കാണാൻ ആർക്കെല്ലാം അനുമതിയുണ്ടെന്ന് തീരുമാനിക്കുക. നിയന്ത്രണം നിങ്ങളുടേതാണ്.
Thoughtfully reviewed resources for learning, understanding, and everyday life.|പഠനത്തിനും മനസ്സിലാക്കലിനും ദൈനംദിന ജീവിതത്തിനുമായി പരിശോധിച്ച സ്രോതസ്സുകൾ.
See the care moments you have recorded together. These patterns support a conversation; they are not a diagnosis.|നിങ്ങൾ ഒരുമിച്ച് രേഖപ്പെടുത്തിയ പരിചരണ നിമിഷങ്ങൾ കാണുക. ഈ മാതൃകകൾ ഒരു സംഭാഷണത്തിന് പിന്തുണ നൽകും; ഇത് രോഗനിർണയമല്ല.
Ask about development and everyday support. Your care team makes clinical decisions.|വളർച്ചയെയും ദൈനംദിന പിന്തുണയെയും കുറിച്ച് ചോദിക്കാം. ചികിത്സാസംബന്ധമായ തീരുമാനങ്ങൾ നിങ്ങളുടെ പരിചരണ സംഘമാണ് എടുക്കേണ്ടത്.
Everything you need, thoughtfully connected.|ആവശ്യമായതെല്ലാം കരുതലോടെ ഒരുമിച്ച്.
YOUR CHILD’S JOURNEY|കുട്ടിയുടെ വളർച്ച
A HOME FOR EVERY LITTLE STEP|ഓരോ ചെറിയ ചുവടിനും ഒരിടം
CONNECTED CLINICAL CARE|ബന്ധിപ്പിച്ച ചികിത്സാ പരിചരണം
YOUR FAMILY SPACE|നിങ്ങളുടെ കുടുംബ ഇടം
FAMILY CARE SPACE|കുടുംബ പരിചരണ ഇടം
Choose a child|ഒരു കുട്ടിയെ തിരഞ്ഞെടുക്കുക
Choose a profile to continue to their care dashboard.|പരിചരണ ഡാഷ്ബോർഡിലേക്ക് തുടരാൻ ഒരു പ്രൊഫൈൽ തിരഞ്ഞെടുക്കുക.
Loading child profiles…|കുട്ടികളുടെ പ്രൊഫൈലുകൾ ലോഡ് ചെയ്യുന്നു…
Child profiles|കുട്ടികളുടെ പ്രൊഫൈലുകൾ
There are no child profiles yet.|ഇതുവരെ കുട്ടികളുടെ പ്രൊഫൈലുകളൊന്നുമില്ല.
CLINICIAN WORKSPACE|വിദഗ്ധന്റെ പ്രവർത്തന ഇടം
OPERATIONS WORKSPACE|നിർവഹണ ഇടം
GROWING WITH|ഒപ്പം വളരുന്നു
SELECTED PATIENT|തിരഞ്ഞെടുത്ത കുട്ടി
Reschedule consultation|കൂടിക്കാഴ്ച സമയം മാറ്റുക
Payout account onboarding|പേയൗട്ട് അക്കൗണ്ട് ചേർക്കൽ
A little step worth remembering|ഓർത്തുവയ്ക്കേണ്ട ഒരു ചെറിയ ചുവട്
Add a health record|ആരോഗ്യ രേഖ ചേർക്കുക
Set a personal goal|വ്യക്തിഗത ലക്ഷ്യം തിരഞ്ഞെടുക്കുക
Record a growth measurement|വളർച്ചയുടെ അളവ് രേഖപ്പെടുത്തുക
Add vaccination record|വാക്സിനേഷൻ രേഖ ചേർക്കുക
Review assessment|വിലയിരുത്തൽ പരിശോധിക്കുക
Plan a therapy session|തെറാപ്പി സെഷൻ ആസൂത്രണം ചെയ്യുക
Update therapy session|തെറാപ്പി സെഷൻ പുതുക്കുക
Offer a consultation slot|കൂടിക്കാഴ്ച സമയം നൽകുക
Send a secure message|സുരക്ഷിത സന്ദേശം അയയ്ക്കുക
Create a referral|റഫറൽ തയ്യാറാക്കുക
Amend signed record|ഒപ്പിട്ട രേഖയിൽ തിരുത്തൽ ചേർക്കുക
Welcome a little one to your nest|കുട്ടിയെ നിങ്ങളുടെ നെസ്റ്റിലേക്ക് ചേർക്കുക
How can we help?|എങ്ങനെ സഹായിക്കാം?
Apply to the care network|പരിചരണ സംഘത്തിലേക്ക് അപേക്ഷിക്കുക
Review provider application|വിദഗ്ധന്റെ അപേക്ഷ പരിശോധിക്കുക
Add learning resource|പഠന സ്രോതസ്സ് ചേർക്കുക
Review learning resource|പഠന സ്രോതസ്സ് പരിശോധിക്കുക
Review support resource|പിന്തുണാ സ്രോതസ്സ് പരിശോധിക്കുക
Resolve privacy request|സ്വകാര്യതാ അഭ്യർത്ഥന പരിഹരിക്കുക
The API is not connected. Start the local services, then try again.|എപിഐയുമായി ബന്ധമില്ല. പ്രാദേശിക സേവനങ്ങൾ ആരംഭിച്ച് വീണ്ടും ശ്രമിക്കുക.
Family account|കുടുംബ അക്കൗണ്ട്
Create a child profile to begin building a thoughtful record of growth.|വളർച്ചയുടെ രേഖകൾ സൂക്ഷിക്കാൻ കുട്ടിയുടെ പ്രൊഫൈൽ ചേർക്കുക.
Start your child’s profile|കുട്ടിയുടെ പ്രൊഫൈൽ തുടങ്ങാം
Start with the essentials. You can add more whenever you are ready.|ആവശ്യമായ അടിസ്ഥാന വിവരങ്ങളിൽ നിന്ന് തുടങ്ങാം. തയ്യാറാകുമ്പോൾ കൂടുതൽ വിവരങ്ങൾ ചേർക്കാം.
Let’s make room for your child’s story.|നമുക്ക് നിങ്ങളുടെ കുട്ടിയുടെ കഥയ്ക്കായി ഇടം ഉണ്ടാക്കാം.
Start with a profile, then add the moments that feel important. You decide who can see them.|ആദ്യം ഒരു പ്രൊഫൈൽ ഉണ്ടാക്കാം. തുടർന്ന് പ്രധാനമെന്ന് തോന്നുന്ന നിമിഷങ്ങൾ ചേർക്കാം. അവ കാണാൻ ആർക്കാണ് അനുവാദമെന്ന് നിങ്ങളാണ് തീരുമാനിക്കുന്നത്.
Create a child profile|കുട്ടിയുടെ പ്രൊഫൈൽ സൃഷ്ടിക്കുക
Explore the library|അറിവ് ശേഖരം കാണുക
Your first steps|ആദ്യ ചുവടുകൾ
Add a few basics|അടിസ്ഥാന വിവരങ്ങൾ ചേർക്കുക
A name, date of birth, and preferred language are enough to begin.|ആരംഭിക്കാൻ പേര്, ജനനത്തീയതി, ഇഷ്ടഭാഷ എന്നിവ മതി.
Notice little moments|ചെറിയ നിമിഷങ്ങൾ ശ്രദ്ധിക്കുക
Record a new word, routine, concern, or a moment of connection.|പുതിയ വാക്ക്, ദിനചര്യ, ആശങ്ക, അല്ലെങ്കിൽ അടുപ്പത്തിന്റെ ഒരു നിമിഷം രേഖപ്പെടുത്തുക.
Bring support together|പിന്തുണ ഒരുമിപ്പിക്കുക
Share only when you choose, with the people supporting your family.|നിങ്ങൾ തിരഞ്ഞെടുക്കുമ്പോൾ മാത്രം, നിങ്ങളുടെ കുടുംബത്തെ പിന്തുണയ്ക്കുന്നവരുമായി പങ്കിടുക.
Saved successfully.|വിജയകരമായി സൂക്ഷിച്ചു.
A LITTLE SUPPORT. A WORLD OF POSSIBILITY.|ഒരു ചെറിയ പിന്തുണ. അനന്തമായ സാധ്യതകൾ.
Every mind blooms|ഓരോ മനസ്സും വിരിയുന്നു
in its own time.|അതിന്റെ സ്വന്തം സമയത്ത്.
Your family. Your records. Your choice.|നിങ്ങളുടെ കുടുംബം. രേഖകൾ. തീരുമാനം.
Welcome to your nest.|നിങ്ങളുടെ നെസ്റ്റിലേക്ക് സ്വാഗതം.
Care feels a little easier when everything comes together.|എല്ലാം ഒരുമിക്കുമ്പോൾ പരിചരണം കൂടുതൽ എളുപ്പമാകുന്നു.
Create your family account|നിങ്ങളുടെ കുടുംബ അക്കൗണ്ട് സൃഷ്ടിക്കുക
Verify your email|നിങ്ങളുടെ ഇമെയിൽ സ്ഥിരീകരിക്കുക
Reset your password|നിങ്ങളുടെ പാസ്‌വേഡ് പുനഃസജ്ജീകരിക്കുക
Set a new password|പുതിയ പാസ്‌വേഡ് സജ്ജമാക്കുക
Finish setting up your account|നിങ്ങളുടെ അക്കൗണ്ട് സജ്ജീകരണം പൂർത്തിയാക്കുക
First, verify the email you will use for recovery.|ആദ്യം, അക്കൗണ്ട് വീണ്ടെടുക്കലിന് ഉപയോഗിക്കുന്ന ഇമെയിൽ സ്ഥിരീകരിക്കുക.
For your security, open the email link in this same browser and device.|സുരക്ഷയ്ക്കായി, ഈ ഇമെയിൽ ലിങ്ക് ഇതേ ബ്രൗസറിലും ഉപകരണത്തിലും തുറക്കുക.
We’ll send a fresh secure link to this email address.|ഈ ഇമെയിൽ വിലാസത്തിലേക്ക് പുതിയ സുരക്ഷിത ലിങ്ക് അയയ്ക്കാം.
Choose your name, username, recovery email, and password. We’ll verify your email before opening your care space.|നിങ്ങളുടെ പേര്, ഉപയോക്തൃനാമം, അക്കൗണ്ട് വീണ്ടെടുക്കൽ ഇമെയിൽ, പാസ്‌വേഡ് എന്നിവ തിരഞ്ഞെടുക്കുക. പരിചരണ ഇടം തുറക്കുന്നതിന് മുമ്പ് ഇമെയിൽ സ്ഥിരീകരിക്കും.
Open the verification link in your email. Enter your email and password below only if you need a fresh link.|ഇമെയിലിലെ സ്ഥിരീകരണ ലിങ്ക് തുറക്കുക. പുതിയ ലിങ്ക് ആവശ്യമുണ്ടെങ്കിൽ മാത്രം താഴെ ഇമെയിലും പാസ്‌വേഡും നൽകുക.
Choose your name and username. Your verified email remains available for recovery.|നിങ്ങളുടെ പേരും ഉപയോക്തൃനാമവും തിരഞ്ഞെടുക്കുക. സ്ഥിരീകരിച്ച ഇമെയിൽ അക്കൗണ്ട് വീണ്ടെടുക്കലിന് ലഭ്യമായിരിക്കും.
Use your account email to sign in.|നിങ്ങളുടെ അക്കൗണ്ട് ഇമെയിൽ ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്യുക.
Verify email|ഇമെയിൽ സ്ഥിരീകരിക്കുക
Finish setup|സജ്ജീകരണം പൂർത്തിയാക്കുക
Use a different account|മറ്റൊരു അക്കൗണ്ട് ഉപയോഗിക്കുക
New password|പുതിയ പാസ്‌വേഡ്
Finish setting up your account after verifying your email.|ഇമെയിൽ സ്ഥിരീകരിച്ച ശേഷം നിങ്ങളുടെ അക്കൗണ്ട് സജ്ജീകരണം പൂർത്തിയാക്കുക.
Check your email to verify it and finish setting up your account.|ഇമെയിൽ സ്ഥിരീകരിച്ച് അക്കൗണ്ട് സജ്ജീകരണം പൂർത്തിയാക്കാൻ ഇൻബോക്സ് പരിശോധിക്കുക.
That secure link is invalid, expired, or was opened in a different browser or device. Request a new link in the browser and device you will use.|ആ സുരക്ഷിത ലിങ്ക് അസാധുവാണ്, കാലഹരണപ്പെട്ടു, അല്ലെങ്കിൽ മറ്റൊരു ബ്രൗസറിലോ ഉപകരണത്തിലോ തുറന്നതാണ്. നിങ്ങൾ ഉപയോഗിക്കുന്ന ബ്രൗസറിലും ഉപകരണത്തിലും പുതിയ ലിങ്ക് അഭ്യർത്ഥിക്കുക.
Create an account to keep your family’s care information together.|നിങ്ങളുടെ കുടുംബത്തിന്റെ പരിചരണ വിവരങ്ങൾ ഒരുമിച്ച് സൂക്ഷിക്കാൻ ഒരു അക്കൗണ്ട് സൃഷ്ടിക്കുക.
We’ll send a fresh verification link to this email address.|ഈ ഇമെയിൽ വിലാസത്തിലേക്ക് പുതിയ സ്ഥിരീകരണ ലിങ്ക് അയയ്ക്കാം.
We’ll email a secure link to reset your password.|നിങ്ങളുടെ പാസ്‌വേഡ് പുനഃസജ്ജീകരിക്കാൻ സുരക്ഷിതമായ ഒരു ലിങ്ക് ഇമെയിൽ ചെയ്യും.
Choose a new password with at least 12 characters.|കുറഞ്ഞത് 12 അക്ഷരങ്ങളുള്ള പുതിയ പാസ്‌വേഡ് തിരഞ്ഞെടുക്കുക.
Create account|അക്കൗണ്ട് സൃഷ്ടിക്കുക
Continue with Google|Google ഉപയോഗിച്ച് തുടരുക
or|അല്ലെങ്കിൽ
Allow pop-ups to continue with Google.|Google ഉപയോഗിച്ച് തുടരാൻ പോപ്പ്-അപ്പുകൾ അനുവദിക്കുക.
Google sign-in is not available yet. Use your username or email instead.|Google സൈൻ-ഇൻ ഇപ്പോൾ ലഭ്യമല്ല. പകരം ഉപയോക്തൃനാമമോ ഇമെയിലോ ഉപയോഗിക്കുക.
Use your username or email to sign in with this account.|ഈ അക്കൗണ്ടിലേക്ക് സൈൻ ഇൻ ചെയ്യാൻ ഉപയോക്തൃനാമമോ ഇമെയിലോ ഉപയോഗിക്കുക.
We couldn’t continue with Google. Please try again.|Google ഉപയോഗിച്ച് തുടരാനായില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.
Google did not provide a verified email for this account.|ഈ അക്കൗണ്ടിന് Google സ്ഥിരീകരിച്ച ഇമെയിൽ നൽകിയില്ല.
Send verification email again|സ്ഥിരീകരണ ഇമെയിൽ വീണ്ടും അയയ്ക്കുക
Send recovery link|പുനഃസജ്ജീകരണ ലിങ്ക് അയയ്ക്കുക
Update password|പാസ്‌വേഡ് പുതുക്കുക
Sign in|സൈൻ ഇൻ ചെയ്യുക
Email address|ഇമെയിൽ വിലാസം
Full name|പൂർണ്ണ നാമം
Username|ഉപയോക്തൃനാമം
This is how you will sign in.|ഇതുപയോഗിച്ചാണ് നിങ്ങൾ സൈൻ ഇൻ ചെയ്യുക.
Use 3–30 letters or numbers, starting with a letter. You may also use . _ or -.|3–30 അക്ഷരങ്ങളോ അക്കങ്ങളോ ഉപയോഗിക്കുക; ഒരു അക്ഷരത്തിൽ തുടങ്ങണം. . _ അല്ലെങ്കിൽ - ഉപയോഗിക്കാം.
Password|പാസ്‌വേഡ്
Confirm password|പാസ്‌വേഡ് സ്ഥിരീകരിക്കുക
Please wait…|ദയവായി കാത്തിരിക്കുക…
Forgot password?|പാസ്‌വേഡ് മറന്നോ?
Create an account|ഒരു അക്കൗണ്ട് സൃഷ്ടിക്കുക
Back to sign in|സൈൻ ഇൻ പേജിലേക്ക് മടങ്ങുക
Use email to sign in|ഇമെയിൽ ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്യുക
Use username to sign in|ഉപയോക്തൃനാമം ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്യുക
Secure sign-in is not configured. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID.|സുരക്ഷിത സൈൻ-ഇൻ സജ്ജീകരിച്ചിട്ടില്ല. VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID എന്നിവ സജ്ജമാക്കുക.
The core API is not configured. Set VITE_API_URL.|കോർ എപിഐ സജ്ജീകരിച്ചിട്ടില്ല. VITE_API_URL സജ്ജമാക്കുക.
Set a new password to finish recovering your account.|അക്കൗണ്ട് വീണ്ടെടുക്കൽ പൂർത്തിയാക്കാൻ പുതിയ പാസ്‌വേഡ് സജ്ജമാക്കുക.
That secure link is invalid or has expired. Request a new verification or recovery email.|ആ സുരക്ഷിത ലിങ്ക് അസാധുവാണ് അല്ലെങ്കിൽ കാലഹരണപ്പെട്ടു. പുതിയ സ്ഥിരീകരണ അല്ലെങ്കിൽ വീണ്ടെടുക്കൽ ഇമെയിൽ അഭ്യർത്ഥിക്കുക.
Password must be at least 12 characters.|പാസ്‌വേഡിൽ കുറഞ്ഞത് 12 അക്ഷരങ്ങൾ ഉണ്ടായിരിക്കണം.
Enter your full name.|നിങ്ങളുടെ പൂർണ്ണ നാമം നൽകുക.
Use at least 12 characters.|കുറഞ്ഞത് 12 അക്ഷരങ്ങൾ ഉപയോഗിക്കുക.
Passwords do not match.|പാസ്‌വേഡുകൾ പൊരുത്തപ്പെടുന്നില്ല.
Check your email to verify your account before signing in.|സൈൻ ഇൻ ചെയ്യുന്നതിന് മുമ്പ് അക്കൗണ്ട് സ്ഥിരീകരിക്കാൻ ഇമെയിൽ പരിശോധിക്കുക.
Verification email sent. Check your inbox to continue.|സ്ഥിരീകരണ ഇമെയിൽ അയച്ചു. തുടരാൻ ഇൻബോക്സ് പരിശോധിക്കുക.
If an account uses this email, a recovery link has been sent.|ഈ ഇമെയിൽ ഉപയോഗിക്കുന്ന അക്കൗണ്ട് ഉണ്ടെങ്കിൽ, ഒരു വീണ്ടെടുക്കൽ ലിങ്ക് അയച്ചിട്ടുണ്ട്.
Your password has been updated.|നിങ്ങളുടെ പാസ്‌വേഡ് പുതുക്കി.
Your account is ready. Sign in with your username.|നിങ്ങളുടെ അക്കൗണ്ട് തയ്യാറാണ്. ഉപയോക്തൃനാമം ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്യുക.
Choose your username|നിങ്ങളുടെ ഉപയോക്തൃനാമം തിരഞ്ഞെടുക്കുക
Choose a username to finish moving your account.|നിങ്ങളുടെ അക്കൗണ്ട് മാറ്റം പൂർത്തിയാക്കാൻ ഒരു ഉപയോക്തൃനാമം തിരഞ്ഞെടുക്കുക.
Choose a username for future sign-ins. Your verified email remains available for recovery.|ഭാവിയിലെ സൈൻ ഇൻ ചെയ്യലുകൾക്കായി ഒരു ഉപയോക്തൃനാമം തിരഞ്ഞെടുക്കുക. അക്കൗണ്ട് വീണ്ടെടുക്കാൻ സ്ഥിരീകരിച്ച ഇമെയിൽ ലഭ്യമായിരിക്കും.
Save username|ഉപയോക്തൃനാമം സംരക്ഷിക്കുക
Use your account email to sign in to a legacy account.|നിലവിലുള്ള അക്കൗണ്ടിലേക്ക് സൈൻ ഇൻ ചെയ്യാൻ അക്കൗണ്ട് ഇമെയിൽ ഉപയോഗിക്കുക.
Use your username to continue. Keep your verified email for account recovery.|തുടരാൻ ഉപയോക്തൃനാമം ഉപയോഗിക്കുക. അക്കൗണ്ട് വീണ്ടെടുക്കാൻ സ്ഥിരീകരിച്ച ഇമെയിൽ സൂക്ഷിക്കുക.
We couldn’t sign you in with those details.|ആ വിവരങ്ങൾ ഉപയോഗിച്ച് നിങ്ങളെ സൈൻ ഇൻ ചെയ്യാൻ കഴിഞ്ഞില്ല.
An account already uses this email. Sign in or reset its password.|ഈ ഇമെയിൽ ഉപയോഗിക്കുന്ന അക്കൗണ്ട് ഇതിനകം ഉണ്ട്. സൈൻ ഇൻ ചെയ്യുക അല്ലെങ്കിൽ പാസ്‌വേഡ് പുനഃസജ്ജീകരിക്കുക.
That secure link is invalid or expired. Request a new one.|ആ സുരക്ഷിത ലിങ്ക് അസാധുവാണ് അല്ലെങ്കിൽ കാലഹരണപ്പെട്ടു. പുതിയ ലിങ്ക് അഭ്യർത്ഥിക്കുക.
Verify your email before opening your care workspace.|നിങ്ങളുടെ പരിചരണ ഇടം തുറക്കുന്നതിന് മുമ്പ് ഇമെയിൽ സ്ഥിരീകരിക്കുക.
Your email still needs verification. Open the link we sent you, or enter your password below to send a fresh link.|നിങ്ങളുടെ ഇമെയിൽ ഇനിയും സ്ഥിരീകരിക്കാനുണ്ട്. ഞങ്ങൾ അയച്ച ലിങ്ക് തുറക്കുക, അല്ലെങ്കിൽ പുതിയ ലിങ്ക് അയയ്ക്കാൻ താഴെ പാസ്‌വേഡ് നൽകുക.
Continue by signing in with your email. If you still need to finish the secure email action, return to the link and complete it there.|നിങ്ങളുടെ ഇമെയിൽ ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്ത് തുടരുക. സുരക്ഷിതമായ ഇമെയിൽ നടപടി ഇനിയും പൂർത്തിയാക്കാനുണ്ടെങ്കിൽ, ലിങ്കിലേക്ക് മടങ്ങി അവിടെ അത് പൂർത്തിയാക്കുക.
We found an existing NeuroNest account for this verified email. Review the link before continuing.|ഈ സ്ഥിരീകരിച്ച ഇമെയിലിനായി നിലവിലുള്ള ഒരു NeuroNest അക്കൗണ്ട് കണ്ടെത്തി. തുടരുന്നതിന് മുമ്പ് ലിങ്ക് പരിശോധിക്കുക.
This account needs an independent identity review before it can be opened. Contact support to continue.|ഈ അക്കൗണ്ട് തുറക്കുന്നതിന് മുമ്പ് സ്വതന്ത്രമായ തിരിച്ചറിയൽ പരിശോധന ആവശ്യമാണ്. തുടരാൻ പിന്തുണാ സംഘത്തെ ബന്ധപ്പെടുക.
Link your existing account|നിങ്ങളുടെ നിലവിലുള്ള അക്കൗണ്ട് ബന്ധിപ്പിക്കുക
We found an existing NeuroNest account with this verified email. Link it only if it is yours. Your care records will stay with that account.|ഈ സ്ഥിരീകരിച്ച ഇമെയിലിനൊപ്പം നിലവിലുള്ള ഒരു NeuroNest അക്കൗണ്ട് കണ്ടെത്തി. അത് നിങ്ങളുടേതാണെങ്കിൽ മാത്രം ബന്ധിപ്പിക്കുക. നിങ്ങളുടെ പരിചരണ രേഖകൾ ആ അക്കൗണ്ടിൽ തന്നെ തുടരും.
Link existing account|നിലവിലുള്ള അക്കൗണ്ട് ബന്ധിപ്പിക്കുക
Cancel and use a different account|റദ്ദാക്കി മറ്റൊരു അക്കൗണ്ട് ഉപയോഗിക്കുക
Your email is verified. Sign in with your email to finish setup.|നിങ്ങളുടെ ഇമെയിൽ സ്ഥിരീകരിച്ചു. സജ്ജീകരണം പൂർത്തിയാക്കാൻ ഇമെയിൽ ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്യുക.
A fresh verification email has been sent.|പുതിയ സ്ഥിരീകരണ ഇമെയിൽ അയച്ചു.
Enter your password to send another verification email.|മറ്റൊരു സ്ഥിരീകരണ ഇമെയിൽ അയക്കാൻ പാസ്‌വേഡ് നൽകുക.
Your password has been updated. Sign in to continue.|നിങ്ങളുടെ പാസ്‌വേഡ് പുതുക്കി. തുടരാൻ സൈൻ ഇൻ ചെയ്യുക.
Please wait a moment before trying again.|വീണ്ടും ശ്രമിക്കുന്നതിന് മുമ്പ് ഒരു നിമിഷം കാത്തിരിക്കുക.
We couldn’t open your care workspace. Please try again.|നിങ്ങളുടെ പരിചരണ ഇടം തുറക്കാൻ കഴിഞ്ഞില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.
We couldn’t complete that request. Please try again.|ആ അഭ്യർത്ഥന പൂർത്തിയാക്കാൻ കഴിഞ്ഞില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.
Retry connection|വീണ്ടും ബന്ധിപ്പിക്കുക
Your sign-in is saved|നിങ്ങളുടെ സൈൻ ഇൻ സംരക്ഷിച്ചിരിക്കുന്നു
Let’s reconnect your nest|നിങ്ങളുടെ നെസ്റ്റിലേക്ക് വീണ്ടും ബന്ധിപ്പിക്കാം
Try again|വീണ്ടും ശ്രമിക്കുക
Your nest|നിങ്ങളുടെ നെസ്റ്റ്
Change language|ഭാഷ മാറ്റുക
Use dark theme|ഇരുണ്ട തീം ഉപയോഗിക്കുക
Use light theme|ഇളം തീം ഉപയോഗിക്കുക
View notifications|അറിയിപ്പുകൾ കാണുക
At your own pace.|നിങ്ങളുടെ സ്വന്തം വേഗത്തിൽ.
Every child’s journey is different. Every little step matters.|ഓരോ കുട്ടിയുടെയും യാത്ര വ്യത്യസ്തമാണ്. ഓരോ ചെറിയ ചുവടും പ്രധാനമാണ്.
Select child profile|കുട്ടിയുടെ പ്രൊഫൈൽ തിരഞ്ഞെടുക്കുക
No child profiles|കുട്ടികളുടെ പ്രൊഫൈലുകളില്ല
You’re offline. Records need a secure connection. Reconnect before saving or refreshing.|നിങ്ങൾ ഓഫ്‌ലൈനിലാണ്. രേഖകൾക്ക് സുരക്ഷിതമായ ഇന്റർനെറ്റ് ബന്ധം ആവശ്യമാണ്. സംരക്ഷിക്കാനോ പുതുക്കാനോ മുമ്പ് വീണ്ടും ബന്ധിപ്പിക്കുക.
Dismiss error|പിശക് അടയ്ക്കുക
Dismiss notification|അറിയിപ്പ് അടയ്ക്കുക
Loading current records|രേഖകൾ എടുക്കുന്നു
Loading queue items…|ക്യൂ ഇനങ്ങൾ എടുക്കുന്നു…
YOUR DAILY CARE SPACE|ഇന്നത്തെ പരിചരണ ഇടം
What feels important today?|ഇന്ന് എന്താണ് ശ്രദ്ധിക്കേണ്ടത്?
Every moment you notice can help build a clearer story. Record a concern, a strength, or a change to discuss with your care team.|നിങ്ങൾ ശ്രദ്ധിക്കുന്ന ഓരോ നിമിഷവും കൂടുതൽ വ്യക്തമായ ഒരു കഥ രൂപപ്പെടുത്താൻ സഹായിക്കും. പരിചരണ സംഘവുമായി ചർച്ച ചെയ്യാൻ ഒരു ആശങ്ക, ഒരു കരുത്ത്, അല്ലെങ്കിൽ ഒരു മാറ്റം രേഖപ്പെടുത്തുക.
Record an observation|ഒരു നിരീക്ഷണം രേഖപ്പെടുത്തുക
NEXT IN YOUR NEST|അടുത്തത് നിങ്ങളുടെ നെസ്റ്റിൽ
Online consultation|ഓൺലൈൻ കൂടിക്കാഴ്ച
View appointment|കൂടിക്കാഴ്ച കാണുക
A caring conversation|കരുതലുള്ള ഒരു സംഭാഷണം
can be a first step.|ആദ്യ ചുവടാകാം.
Connect with a verified specialist, on your schedule.|സ്ഥിരീകരിച്ച വിദഗ്ധനുമായി അനുയോജ്യമായ സമയത്ത് സംസാരിക്കുക.
Find your care team|പരിചരണ സംഘത്തെ കണ്ടെത്തുക
little moments|ചെറിയ നിമിഷങ്ങൾ
Every observation tells a story|ഓരോ നിരീക്ഷണവും ഒരു കഥ പറയുന്നു
personal wins|വ്യക്തിഗത നേട്ടങ്ങൾ
Progress at your own pace|സ്വന്തം വേഗത്തിൽ പുരോഗതി
care connections|പരിചരണ ബന്ധങ്ങൾ
Your next steps, together|അടുത്ത ചുവടുകൾ ഒരുമിച്ച്
The little things, lately|അടുത്തിടെയുള്ള ചെറിയ വിശേഷങ്ങൾ
View journey|വളർച്ച കാണുക
Your story starts with a moment|ഒരു നിമിഷത്തിൽ കഥ തുടങ്ങുന്നു
Notice something new? Add an observation to begin.|പുതിയത് ശ്രദ്ധിച്ചോ? ഒരു നിരീക്ഷണം രേഖപ്പെടുത്തുക.
Add an observation|നിരീക്ഷണം ചേർക്കുക
MEET YOUR NEST ASSISTANT|നെസ്റ്റ് സഹായിയെ പരിചയപ്പെടുക
A question is a good|ഒരു ചോദ്യത്തിൽ നിന്ന്
place to begin.|തുടങ്ങാം.
Find thoughtful, source-backed guidance for the everyday questions.|ദൈനംദിന ചോദ്യങ്ങൾക്ക് സ്രോതസ്സുകളുള്ള മാർഗനിർദേശം നേടുക.
Let’s talk|സംസാരിക്കാം
Something to work towards|മുന്നോട്ട് പോകാൻ ഒരു ലക്ഷ്യം
Add goal|ലക്ഷ്യം ചേർക്കുക
Small, meaningful goals are a lovely place to start.|ചെറിയ, അർത്ഥവത്തായ ലക്ഷ്യങ്ങളിൽ തുടങ്ങാം.
Your child’s story belongs to your family.|കുട്ടിയുടെ വിവരങ്ങൾ നിങ്ങളുടെ കുടുംബത്തിന്റേതാണ്.
Manage who has access|പ്രവേശനാനുമതി നിയന്ത്രിക്കുക
A journal of everyday growth|ദൈനംദിന വളർച്ചയുടെ കുറിപ്പുകൾ
New observation|പുതിയ നിരീക്ഷണം
Record a concern|ഒരു ആശങ്ക രേഖപ്പെടുത്തുക
What happened or changed?|എന്താണ് സംഭവിച്ചതോ മാറിയതോ?
For example: used fewer words at dinner or covered ears during a loud event.|ഉദാഹരണം: അത്താഴസമയത്ത് കുറച്ച് വാക്കുകൾ മാത്രം ഉപയോഗിച്ചു, അല്ലെങ്കിൽ വലിയ ശബ്ദത്തിൽ ചെവികൾ മൂടി.
What area does it relate to?|ഇത് ഏത് മേഖലയുമായി ബന്ധപ്പെട്ടതാണ്?
Communication|ആശയവിനിമയം
Social connection|സാമൂഹിക ഇടപെടൽ
Movement|ചലനം
Everyday routines|ദൈനംദിന ശീലങ്ങൾ
Sensory experiences|ഇന്ദ്രിയാനുഭവങ്ങൾ
Feelings & behaviour|വികാരങ്ങളും പെരുമാറ്റവും
Sleep|ഉറക്കം
Eating|ഭക്ഷണം
Something else|മറ്റൊന്ന്
How would you describe it?|നിങ്ങൾ ഇതിനെ എങ്ങനെ വിവരിക്കും?
Something I noticed|ഞാൻ ശ്രദ്ധിച്ച ഒരു കാര്യം
Not doing this yet|ഇതുവരെ ചെയ്യുന്നില്ല
I’m not sure|എനിക്ക് ഉറപ്പില്ല
Skill reduced or stopped|കഴിവ് കുറഞ്ഞു അല്ലെങ്കിൽ നിലച്ചു
Add any details that may help|സഹായകമായ കൂടുതൽ വിവരങ്ങൾ ചേർക്കുക
What happened before, during and after? Include when it started, where it happens and how often if you know.|മുമ്പും സമയത്തും ശേഷവും എന്ത് സംഭവിച്ചു? എപ്പോൾ തുടങ്ങി, എവിടെയാണ് സംഭവിക്കുന്നത്, എത്ര തവണയാണെന്ന് അറിയാമെങ്കിൽ ചേർക്കുക.
This saves a parent concern for your care team. It does not diagnose autism. If a skill has reduced or stopped, contact your clinician promptly.|ഇത് നിങ്ങളുടെ പരിചരണ സംഘത്തിനായി രക്ഷിതാവിന്റെ ആശങ്കയായി സൂക്ഷിക്കും. ഇത് ഓട്ടിസം രോഗനിർണയം നടത്തുന്നില്ല. ഒരു കഴിവ് കുറഞ്ഞതോ നിലച്ചതോ ആണെങ്കിൽ ഉടൻ ചികിത്സാവിദഗ്ധനെ ബന്ധപ്പെടുക.
Observations & concerns|നിരീക്ഷണങ്ങളും ആശങ്കകളും
PARENT OBSERVATIONS|രക്ഷിതാവിന്റെ നിരീക്ഷണങ്ങൾ
A place for changes, questions and concerns|മാറ്റങ്ങൾക്കും ചോദ്യങ്ങൾക്കും ആശങ്കകൾക്കുമുള്ള ഇടം
Use this space to record a change, an unusual moment, or a question. Your note is a parent observation for your care team; it is not a diagnosis.|ഒരു മാറ്റമോ അസാധാരണ നിമിഷമോ ചോദ്യമോ രേഖപ്പെടുത്താൻ ഈ ഇടം ഉപയോഗിക്കുക. നിങ്ങളുടെ കുറിപ്പ് പരിചരണ സംഘത്തിനുള്ള രക്ഷിതാവിന്റെ നിരീക്ഷണമാണ്; ഇത് രോഗനിർണയമല്ല.
Need help sooner?|വേഗത്തിൽ സഹായം വേണോ?
If there is immediate danger, call 112. If a skill has reduced or stopped, contact your clinician promptly.|ഉടൻ അപകടസാധ്യതയുണ്ടെങ്കിൽ 112-ൽ വിളിക്കുക. ഒരു കഴിവ് കുറഞ്ഞതോ നിലച്ചതോ ആണെങ്കിൽ ഉടൻ ചികിത്സാവിദഗ്ധനെ ബന്ധപ്പെടുക.
No concerns or observations yet|ഇതുവരെ ആശങ്കകളോ നിരീക്ഷണങ്ങളോ ഇല്ല
A change, an unusual moment, or a question can be useful to remember. Start here.|ഒരു മാറ്റമോ അസാധാരണ നിമിഷമോ ചോദ്യമോ ഓർത്തുവയ്ക്കാൻ സഹായകമാണ്. ഇവിടെ തുടങ്ങുക.
There’s no small moment|ഓരോ നിമിഷവും പ്രധാനമാണ്
A new word, a new routine, something you’re wondering about. Start here.|ഒരു പുതിയ വാക്കോ ശീലമോ സംശയമോ. ഇവിടെ തുടങ്ങാം.
Talk with your care team about this change.|ഈ മാറ്റത്തെക്കുറിച്ച് പരിചരണ സംഘവുമായി സംസാരിക്കുക.
Progress that belongs to your child|കുട്ടിയുടെ സ്വന്തം പുരോഗതി
New goal|പുതിയ ലക്ഷ്യം
Celebrate this win|ഈ നേട്ടം ആഘോഷിക്കുക
Pause|താൽക്കാലികമായി നിർത്തുക
Resume|തുടരുക
Start small, dream warmly|ചെറിയ ചുവടുകളിൽ തുടങ്ങാം
Create a goal that matters to your family. There’s no comparison or leaderboard.|കുടുംബത്തിന് പ്രാധാന്യമുള്ള ലക്ഷ്യം തിരഞ്ഞെടുക്കുക. താരതമ്യങ്ങളില്ല.
Growth over time|കാലക്രമത്തിലെ വളർച്ച
Add measurement|അളവ് ചേർക്കുക
Your measurements, without unvalidated percentile comparisons.|സ്ഥിരീകരിക്കാത്ത പെർസന്റൈൽ താരതമ്യങ്ങളില്ലാതെ നിങ്ങളുടെ അളവുകൾ.
Weight (kg) · chronological measurements|ഭാരം (കിലോ) · തീയതി ക്രമത്തിലുള്ള അളവുകൾ
Growing, in their own time|സ്വന്തം സമയത്ത് വളരുന്നു
Vaccination record|വാക്സിനേഷൻ രേഖ
Add record|രേഖ ചേർക്കുക
Keep the important dates together|പ്രധാന തീയതികൾ ഒരിടത്ത്
Confirm vaccination timing with your clinician. This record does not determine eligibility.|വാക്സിനേഷൻ സമയം ഡോക്ടറുമായി ഉറപ്പാക്കുക. ഈ രേഖ അർഹത നിശ്ചയിക്കുന്നില്ല.
Understanding starts with the right support.|ശരിയായ പിന്തുണയിൽ മനസ്സിലാക്കൽ തുടങ്ങുന്നു.
Screening can guide a conversation. It does not diagnose autism. Tools are available only for their approved ages, languages and licenses.|സ്ക്രീനിംഗ് ഒരു സംഭാഷണത്തിന് വഴികാട്ടാം; അത് ഓട്ടിസം രോഗനിർണയമല്ല. ഉപകരണങ്ങൾ അവയുടെ അംഗീകൃത പ്രായപരിധി, ഭാഷ, ലൈസൻസ് എന്നിവയ്ക്കു മാത്രമാണ് ലഭ്യമാകുന്നത്.
Developmental screening|വളർച്ചാപരമായ സ്ക്രീനിംഗ്
Start|തുടങ്ങുക
No authorized screening tools available|അംഗീകൃത സ്ക്രീനിംഗ് ഉപകരണങ്ങൾ ലഭ്യമല്ല
Instrument licenses and clinical configuration are required before use.|ഉപയോഗത്തിന് മുമ്പ് ലൈസൻസും ക്ലിനിക്കൽ ക്രമീകരണവും ആവശ്യമാണ്.
Previous screening sessions|മുൻ സ്ക്രീനിംഗുകൾ
Review|പരിശോധിക്കുക
Support that grows with your child|കുട്ടിയോടൊപ്പം വളരുന്ന പിന്തുണ
Plan session|സെഷൻ ആസൂത്രണം ചെയ്യുക
Update progress|പുരോഗതി പുതുക്കുക
A shared plan, a little more support|പങ്കിട്ട പദ്ധതി, കൂടുതൽ പിന്തുണ
All specialists|എല്ലാ വിദഗ്ധരും
Hold this time|ഈ സമയം താൽക്കാലികമായി മാറ്റിവയ്ക്കുക
No open slots right now|ഇപ്പോൾ ഒഴിവുള്ള സമയമില്ല
Check back with this specialist, or choose another care professional.|പിന്നീട് നോക്കുക, അല്ലെങ്കിൽ മറ്റൊരു വിദഗ്ധനെ തിരഞ്ഞെടുക്കുക.
Find by name, specialty or language|പേര്, വൈദഗ്ധ്യം, ഭാഷ എന്നിവയാൽ തിരയുക
Verified care professionals|സ്ഥിരീകരിച്ച പരിചരണ വിദഗ്ധർ
Add availability|ലഭ്യമായ സമയം ചേർക്കുക
Verified|സ്ഥിരീകരിച്ചു
per consultation|ഓരോ കൂടിക്കാഴ്ചയ്ക്കും
View availability|ലഭ്യമായ സമയം കാണുക
Your care network is taking shape|നിങ്ങളുടെ പരിചരണ സംഘം രൂപപ്പെടുന്നു
Verified professionals will appear here after onboarding.|ചേരൽ പൂർത്തിയായ വിദഗ്ധർ ഇവിടെ പ്രത്യക്ഷപ്പെടും.
Time for your care|പരിചരണത്തിനുള്ള സമയം
Book a visit|കൂടിക്കാഴ്ച ബുക്ക് ചെയ്യുക
Your care conversations|പരിചരണ സംഭാഷണങ്ങൾ
New message|പുതിയ സന്ദേശം
A direct line to your care team|പരിചരണ സംഘവുമായി നേരിട്ട് ബന്ധപ്പെടാം
Choose a verified professional and start a routine care conversation.|സ്ഥിരീകരിച്ച വിദഗ്ധനെ തിരഞ്ഞെടുത്ത് പരിചരണ സംഭാഷണം തുടങ്ങുക.
A clear view of your payments|നിങ്ങളുടെ പണമിടപാടുകളുടെ വിവരങ്ങൾ
Request refund|പണം തിരികെ ആവശ്യപ്പെടുക
No payments yet|പണമിടപാടുകളില്ല
Your booking payments and refunds will be listed here.|ബുക്കിംഗ് പണമിടപാടുകളും മടക്കങ്ങളും ഇവിടെ കാണാം.
The next connection|അടുത്ത ബന്ധം
New referral|പുതിയ റഫറൽ
Care, connected|ബന്ധിപ്പിച്ച പരിചരണം
Export|രേഖകൾ കയറ്റുമതി ചെയ്യുക
Documents & reports|ഡോക്യുമെന്റുകളും റിപ്പോർട്ടുകളും
Upload document|ഡോക്യുമെന്റ് അപ്‌ലോഡ് ചെയ്യുക
Uploads stay quarantined until scanning accepts them. Access is checked again on every download.|സ്കാനിംഗ് അംഗീകരിക്കുംവരെ അപ്‌ലോഡ് ചെയ്ത ഫയലുകൾ ക്വാറന്റൈനിലായിരിക്കും. ഓരോ ഡൗൺലോഡിനുമുമ്പും പ്രവേശനാനുമതി വീണ്ടും പരിശോധിക്കും.
Download|ഡൗൺലോഡ്
Their documents, safely together|രേഖകൾ സുരക്ഷിതമായി ഒരിടത്ത്
Your family, your permissions|കുടുംബം, നിങ്ങളുടെ അനുമതികൾ
Share with care team|പരിചരണ സംഘവുമായി പങ്കിടുക
Every access is child-specific. Expired or revoked access stops future reads, exports and downloads.|ഓരോ പ്രവേശനാനുമതിയും ഓരോ കുട്ടിക്കായി പ്രത്യേകമാണ്. കാലഹരണപ്പെട്ടതോ പിൻവലിച്ചതോ ആയ അനുമതി ഉപയോഗിച്ച് പിന്നീട് രേഖകൾ കാണാനോ എക്സ്പോർട്ട് ചെയ്യാനോ ഡൗൺലോഡ് ചെയ്യാനോ കഴിയില്ല.
Revoke access|അനുമതി പിൻവലിക്കുക
You choose who is part of the story|ആർക്കെല്ലാം പ്രവേശിക്കാമെന്ന് നിങ്ങൾ തീരുമാനിക്കുന്നു
Share only what is needed with your verified care professionals.|ആവശ്യമായ വിവരങ്ങൾ മാത്രം സ്ഥിരീകരിച്ച വിദഗ്ധരുമായി പങ്കിടുക.
Record access history|രേഖകളുടെ പ്രവേശന ചരിത്രം
Access events appear here|പ്രവേശന വിവരങ്ങൾ ഇവിടെ കാണാം
One place for their health story|ആരോഗ്യ വിവരങ്ങൾക്ക് ഒരിടം
Add reports and notes, then share them with the people supporting your child.|റിപ്പോർട്ടുകളും കുറിപ്പുകളും ചേർത്ത് പരിചരണ സംഘവുമായി പങ്കിടുക.
Sign record|രേഖ ഒപ്പിടുക
Create amendment|തിരുത്തൽ ചേർക്കുക
What would you like to understand?|എന്തിനെക്കുറിച്ച് അറിയണം?
A network beyond your screen|സ്ക്രീനിന് പുറത്തുള്ള പിന്തുണ
Visit resource|സ്രോതസ്സ് സന്ദർശിക്കുക
Curated support resources appear here|പരിശോധിച്ച പിന്തുണാ സ്രോതസ്സുകൾ ഇവിടെ കാണാം
Reviewed resource|പരിശോധിച്ച സ്രോതസ്സ്
Good information deserves a thoughtful review|നല്ല വിവരങ്ങൾക്ക് ശ്രദ്ധാപൂർവമായ പരിശോധന
Approved articles and videos will appear here.|അംഗീകരിച്ച ലേഖനങ്ങളും വീഡിയോകളും ഇവിടെ കാണാം.
Nest Assistant|നെസ്റ്റ് അസിസ്റ്റന്റ്
Nest assistant|നെസ്റ്റ് സഹായി
Edit name|പേര് തിരുത്തുക
Your name|നിങ്ങളുടെ പേര്
Ask Nest|നെസ്റ്റിനോട് ചോദിക്കുക
Open Nest assistant|നെസ്റ്റ് സഹായിയെ തുറക്കുക
Open Nest Assistant|നെസ്റ്റ് അസിസ്റ്റന്റ് തുറക്കുക
Source-backed learning ·|സ്രോതസ്സുകളുള്ള പഠനം ·
Education & support|അറിവും പിന്തുണയും
You don’t have to have|എല്ലാ ഉത്തരങ്ങളും
all the answers.|സ്വയം കണ്ടെത്തേണ്ടതില്ല.
Start with what’s on your mind. I can help you understand everyday support and find reviewed information.|നിങ്ങളുടെ മനസ്സിലുള്ളതിൽ നിന്ന് തുടങ്ങാം. ദൈനംദിന പിന്തുണ മനസ്സിലാക്കാനും പരിശോധിച്ച വിവരങ്ങൾ കണ്ടെത്താനും ഞാൻ സഹായിക്കാം.
What would you like to talk through?|നിങ്ങൾ എന്തിനെക്കുറിച്ച് സംസാരിക്കാൻ ആഗ്രഹിക്കുന്നു?
Start with an everyday concern or care question. Nest Assistant shares reviewed information for you to consider with your care team.|ദൈനംദിന ആശങ്കയോ പരിചരണവുമായി ബന്ധപ്പെട്ട ചോദ്യമോ ഉപയോഗിച്ച് തുടങ്ങാം. നിങ്ങളുടെ പരിചരണ സംഘത്തോടൊപ്പം ആലോചിക്കാനായി നെസ്റ്റ് അസിസ്റ്റന്റ് പരിശോധിച്ച വിവരങ്ങൾ പങ്കിടും.
Try one of these questions|ഈ ചോദ്യങ്ങളിലൊന്ന് പരീക്ഷിക്കൂ
Include authorized record context for|അനുമതിയുള്ള രേഖകൾ ഉൾപ്പെടുത്തുക:
Clinical decisions belong with your care team. Record context requires an approved provider configuration.|ചികിത്സാസംബന്ധമായ തീരുമാനങ്ങൾ നിങ്ങളുടെ പരിചരണ സംഘമാണ് എടുക്കേണ്ടത്. രേഖാസന്ദർഭം ഉപയോഗിക്കാൻ അംഗീകൃത സേവനദാതാവിന്റെ സജ്ജീകരണം ആവശ്യമാണ്.
Select a child to include authorized record context.|അനുമതിയുള്ള രേഖാ സന്ദർഭം ഉൾപ്പെടുത്താൻ ഒരു കുട്ടിയെ തിരഞ്ഞെടുക്കുക.
Nest Assistant checks the selected child's records permission again for every question.|ഓരോ ചോദ്യത്തിനും തിരഞ്ഞെടുത്ത കുട്ടിയുടെ രേഖകളിലേക്കുള്ള അനുമതി നെസ്റ്റ് അസിസ്റ്റന്റ് വീണ്ടും പരിശോധിക്കും.
Record context is unavailable until patient-data processing is approved.|രോഗിയുടെ ഡാറ്റ പ്രോസസ്സ് ചെയ്യുന്നതിനുള്ള അംഗീകാരം ലഭിക്കുന്നതുവരെ രേഖാ സന്ദർഭം ലഭ്യമല്ല.
Thoughtful by design.|കരുതലോടെ രൂപകല്പന ചെയ്തത്.
Answers use a reviewed knowledge collection. Sources are linked so you can read further.|ഉത്തരങ്ങൾ പരിശോധിച്ച അറിവുസമാഹാരത്തെ അടിസ്ഥാനമാക്കിയാണ്. കൂടുതൽ വായിക്കാൻ സ്രോതസ്സുകളുടെ ലിങ്കുകൾ നൽകിയിട്ടുണ്ട്.
Record access is checked again for every question. Switching children clears this conversation.|ഓരോ ചോദ്യത്തിനും രേഖകളിലേക്കുള്ള പ്രവേശനാനുമതി വീണ്ടും പരിശോധിക്കുന്നു. കുട്ടിയെ മാറ്റുമ്പോൾ ഈ സംഭാഷണം മായ്ക്കപ്പെടും.
Need someone in your corner?|പിന്തുണയ്ക്കാൻ ഒരാൾ വേണോ?
A qualified professional can help you make sense of your child’s individual needs.|കുട്ടിയുടെ വ്യക്തിഗത ആവശ്യങ്ങൾ മനസ്സിലാക്കാൻ ഒരു യോഗ്യതയുള്ള വിദഗ്ധന് നിങ്ങളെ സഹായിക്കാനാകും.
Find a specialist|വിദഗ്ധനെ കണ്ടെത്തുക
Your family profiles|കുടുംബ പ്രൊഫൈലുകൾ
Add child|കുട്ടിയെ ചേർക്കുക
Edit|മാറ്റുക
Your family circle|കുടുംബ വൃത്തം
Invite guardian|രക്ഷിതാവിനെ ക്ഷണിക്കുക
Accept|സ്വീകരിക്കുക
Revoke|പിൻവലിക്കുക
Invite the people who support your family. Choose their level of access.|കുടുംബത്തെ പിന്തുണയ്ക്കുന്നവരെ ക്ഷണിച്ച് അനുമതി തിരഞ്ഞെടുക്കുക.
Privacy & support|സ്വകാര്യതയും പിന്തുണയും
New request|പുതിയ അഭ്യർത്ഥന
Request a correction, export, deletion, or support with your child’s transition to adulthood.|തിരുത്തൽ, രേഖകളുടെ പകർപ്പ്, ഇല്ലാതാക്കൽ, പ്രായപൂർത്തിയിലേക്കുള്ള മാറ്റം എന്നിവയ്ക്ക് സഹായം ആവശ്യപ്പെടുക.
Your account|നിങ്ങളുടെ അക്കൗണ്ട്
App language|ആപ്പിന്റെ ഭാഷ
Email reminders|ഇമെയിൽ ഓർമ്മപ്പെടുത്തലുകൾ
Mobile push reminders|മൊബൈൽ അറിയിപ്പുകൾ
Sign out|പുറത്തുകടക്കുക
Join the care network|പരിചരണ സംഘത്തിൽ ചേരുക
Doctors, therapists and mentors can apply to support families on NeuroNest.|ഡോക്ടർമാർക്കും തെറാപ്പിസ്റ്റുകൾക്കും മെന്റർമാർക്കും കുടുംബങ്ങളെ സഹായിക്കാൻ അപേക്ഷിക്കാം.
Apply as a professional|വിദഗ്ധനായി അപേക്ഷിക്കുക
A little nudge, when it matters|ആവശ്യമായപ്പോൾ ഒരു ഓർമ്മപ്പെടുത്തൽ
Refresh|പുതുക്കുക
Mark read|വായിച്ചതായി അടയാളപ്പെടുത്തുക
You’re all caught up|പുതിയ അറിയിപ്പുകളില്ല
Appointment reminders and care updates will appear here.|കൂടിക്കാഴ്ച ഓർമ്മപ്പെടുത്തലുകളും പരിചരണ വിവരങ്ങളും ഇവിടെ കാണാം.
Build a trusted care network|വിശ്വസ്ത പരിചരണ സംഘം രൂപപ്പെടുത്തുക
Review application|അപേക്ഷ പരിശോധിക്കുക
No applications awaiting your attention|പരിശോധിക്കാനുള്ള അപേക്ഷകളില്ല
Set up payouts|പണം സ്വീകരിക്കൽ സജ്ജമാക്കുക
Thoughtful information starts here|പരിശോധിച്ച വിവരങ്ങൾ ഇവിടെ തുടങ്ങുന്നു
Add resource|സ്രോതസ്സ് ചേർക്കുക
Inspect source|സ്രോതസ്സ് പരിശോധിക്കുക
Review resource|സ്രോതസ്സ് പരിശോധിക്കുക
Support directory|പിന്തുണാ ഡയറക്ടറി
Add support resource|പിന്തുണാ സ്രോതസ്സ് ചേർക്കുക
Payments & reconciliation|പണമിടപാടുകളും പൊരുത്തപ്പെടുത്തലും
Refunded|തിരികെ നൽകിയത്
Reconcile|പൊരുത്തപ്പെടുത്തുക
Request payout|പേയൗട്ട് ആവശ്യപ്പെടുക
Refund|പണം തിരികെ നൽകുക
No financial events yet|സാമ്പത്തിക ഇടപാടുകളില്ല
No learning resources need review|പരിശോധിക്കാനുള്ള പഠന വിഭവങ്ങളൊന്നുമില്ല
Privacy requests & support incidents|സ്വകാര്യതാ അഭ്യർത്ഥനകളും പിന്തുണാ സംഭവങ്ങളും
Review request|അഭ്യർത്ഥന പരിശോധിക്കുക
No open requests|തീർപ്പാകാത്ത അഭ്യർത്ഥനകളില്ല
Readiness is evidence, not a label|സജ്ജത ഒരു ലേബൽ മാത്രമല്ല; അത് തെളിവിനെ അടിസ്ഥാനമാക്കിയുള്ളതാണ്.
External integrations and clinical capabilities remain unavailable until their configuration and evidence are in place.|ക്രമീകരണവും തെളിവുകളും ലഭിക്കുന്നതുവരെ ബാഹ്യ സേവനങ്ങളും ചികിത്സാ ശേഷികളും ലഭ്യമല്ല.
Readiness is unavailable|സജ്ജതാ വിവരം ലഭ്യമല്ല
Made for every kind of growing.|എല്ലാവിധ വളർച്ചയ്ക്കുമായി.
Private consultation · recording disabled|സ്വകാര്യ കൂടിക്കാഴ്ച · റെക്കോർഡിംഗ് പ്രവർത്തനരഹിതമാണ്
Demo consultation · recording disabled|ഡെമോ കൂടിക്കാഴ്ച · റെക്കോർഡിംഗ് പ്രവർത്തനരഹിതമാണ്
Open demo doctor view|ഡെമോ ഡോക്ടറുടെ ദൃശ്യം തുറക്കുക
Leave consultation|കൂടിക്കാഴ്ചയിൽ നിന്ന് പുറത്തുകടക്കുക
Connecting to your consultation…|കൂടിക്കാഴ്ചയിലേക്ക് ബന്ധിപ്പിക്കുന്നു…
Screening session|സ്ക്രീനിംഗ് സെഷൻ
Choose a response|ഉത്തരം തിരഞ്ഞെടുക്കുക
Submit responses|ഉത്തരങ്ങൾ സമർപ്പിക്കുക
The engine has not supplied licensed questions for this session. Contact the care team before continuing.|ഈ സെഷനായി എൻജിൻ ലൈസൻസുള്ള ചോദ്യങ്ങൾ നൽകിയിട്ടില്ല. തുടരുന്നതിന് മുമ്പ് പരിചരണ സംഘത്തെ ബന്ധപ്പെടുക.
Close dialog|വിൻഡോ അടയ്ക്കുക
Your updates will appear here when you add them.|നിങ്ങൾ ചേർക്കുമ്പോൾ അപ്ഡേറ്റുകൾ ഇവിടെ കാണാം.
Continue|തുടരുക
Sign this record?|ഈ രേഖ ഒപ്പിടണോ?
Signing marks this as the clinical record for {child}.|{child} എന്ന കുട്ടിക്കുള്ള ക്ലിനിക്കൽ രേഖയായി ഇതിൽ ഒപ്പിടുന്നത് അടയാളപ്പെടുത്തും.
A signed record can no longer be edited, only amended with a reason.|ഒപ്പിട്ട രേഖ പിന്നീട് തിരുത്താനാവില്ല; കാരണം സഹിതം ഭേദഗതി മാത്രമേ സാധിക്കൂ.
Revoke this access?|ഈ അനുമതി പിൻവലിക്കണോ?
This care professional immediately loses access to|ഈ പരിചരണ വിദഗ്ധന് ഉടൻ പ്രവേശനം നഷ്ടമാകും
’s records, including any consultation in progress.|യുടെ രേഖകളിലേക്ക്, നടന്നുകൊണ്ടിരിക്കുന്ന കൂടിക്കാഴ്ച ഉൾപ്പെടെ.
Revoke this guardian’s access?|ഈ രക്ഷാകർത്താവിന്റെ അനുമതി പിൻവലിക്കണോ?
will immediately lose access to|ഉടൻ പ്രവേശനം നഷ്ടമാകും
’s profile, records and messages.|യുടെ പ്രൊഫൈൽ, രേഖകൾ, സന്ദേശങ്ങൾ എന്നിവയിലേക്ക്.
Hold this consultation?|ഈ കൂടിക്കാഴ്ച താൽക്കാലികമായി റിസർവ് ചെയ്യണോ?
The slot is held for a short time while you pay; it is released if payment is not completed.|നിങ്ങൾ പണമടയ്ക്കുമ്പോൾ ഈ സമയസ്ലോട്ട് കുറച്ചുസമയം റിസർവ് ചെയ്തിരിക്കും; പണമടയ്ക്കൽ പൂർത്തിയാകാത്ത പക്ഷം അത് വീണ്ടും ലഭ്യമാക്കും.
Request a refund?|റീഫണ്ട് അഭ്യർത്ഥിക്കണോ?
The provider and operations team review refund requests. The amount returned follows the cancellation policy recorded on this booking.|റീഫണ്ട് അഭ്യർഥനകൾ ദാതാവും നിർവഹണ സംഘവും പരിശോധിക്കും. തിരികെ നൽകുന്ന തുക ഈ ബുക്കിംഗിലെ റദ്ദാക്കൽ നയപ്രകാരമാണ്.
Request a full refund?|മുഴുവൻ തുകയും തിരികെ നൽകണോ?
This returns the entire captured amount to the payer. Provider payout and reconciliation are affected.|ഇത് ഈടാക്കിയ മുഴുവൻ തുകയും അടച്ചയാൾക്ക് തിരികെ നൽകും. ദാതാവിന്റെ പേയ്ഔട്ടിനെയും ഒത്തുനോക്കലിനെയും ഇത് ബാധിക്കും.
Refund in full|മുഴുവനായി തിരികെ നൽകുക
Cancel this appointment?|ഈ കൂടിക്കാഴ്ച റദ്ദാക്കണോ?
Any refund follows the cancellation policy recorded on this booking.|തിരികെ നൽകുന്ന തുക ഈ ബുക്കിംഗിലെ റദ്ദാക്കൽ നയപ്രകാരമായിരിക്കും.
Cancel appointment|അപ്പോയിന്റ്മെന്റ് റദ്ദാക്കുക
Keep appointment|അപ്പോയിന്റ്മെന്റ് നിലനിർത്തുക
Showing the most recent {shown} of {total}.|ആകെയുള്ള {total}ൽ ഏറ്റവും പുതിയ {shown} എണ്ണം കാണിക്കുന്നു.
of|ൽ
Narrow your search or open a specific entry to see more.|കൂടുതൽ കാണാൻ തിരയൽ പരിമിതപ്പെടുത്തുക അല്ലെങ്കിൽ ഒരു എൻട്രി തുറക്കുക.
the selected patient|തിരഞ്ഞെടുത്ത രോഗി
the selected child|തിരഞ്ഞെടുത്ത കുട്ടി
this child|ഈ കുട്ടി
Cancel|റദ്ദാക്കുക
Retry|വീണ്ടും ശ്രമിക്കുക
Pay & confirm|പണമടച്ച് ഉറപ്പാക്കുക
Join visit|കൂടിക്കാഴ്ചയിൽ ചേരുക
Complete|പൂർത്തിയാക്കുക
Reschedule|സമയം മാറ്റുക
Mark no-show|ഹാജരായില്ലെന്ന് അടയാളപ്പെടുത്തുക
A little room for care|പരിചരണത്തിനായി സമയം
Book time with a specialist when your family needs it.|കുടുംബത്തിന് ആവശ്യമുള്ളപ്പോൾ വിദഗ്ധന്റെ സമയം ബുക്ക് ചെയ്യുക.
Opening your nest…|നിങ്ങളുടെ നെസ്റ്റ് തുറക്കുന്നു…
Skip to main content|പ്രധാന ഉള്ളടക്കത്തിലേക്ക് പോകുക
Save changes|മാറ്റങ്ങൾ സൂക്ഷിക്കുക
Saving…|സൂക്ഷിക്കുന്നു…
Little moments|ചെറിയ നിമിഷങ്ങൾ
Goals & achievements|ലക്ഷ്യങ്ങളും നേട്ടങ്ങളും
Growth & vaccinations|വളർച്ചയും വാക്സിനേഷനും
Milestones|വളർച്ചാ നാഴികക്കല്ലുകൾ
Screening|സ്ക്രീനിംഗ്
Therapy|തെറാപ്പി
Appointments|കൂടിക്കാഴ്ചകൾ
Care messages|പരിചരണ സന്ദേശങ്ങൾ
Payments|പണമിടപാടുകൾ
Referrals|റഫറലുകൾ
Health records|ആരോഗ്യ രേഖകൾ
Documents|ഡോക്യുമെന്റുകൾ
Sharing & consent|പങ്കിടലും സമ്മതവും
Access history|പ്രവേശന ചരിത്രം
All learning|എല്ലാ പഠനവും
Watch|കാണുക
Read|വായിക്കുക
Local support|പ്രാദേശിക പിന്തുണ
Provider verification|വിദഗ്ധ പരിശോധന
Content review|ഉള്ളടക്ക പരിശോധന
Privacy & incidents|സ്വകാര്യതയും സംഭവങ്ങളും
System readiness|സിസ്റ്റം സജ്ജത
Overview|അവലോകനം
Care professional|പരിചരണ വിദഗ്ധൻ
Guardian|രക്ഷിതാവ്
What did you notice?|എന്താണ് ശ്രദ്ധിച്ചത്?
Development area|വളർച്ചാ മേഖല
Observation|നിരീക്ഷണം
Your notes|നിങ്ങളുടെ കുറിപ്പുകൾ
Observed on|നിരീക്ഷിച്ച തീയതി
Record title|രേഖയുടെ പേര്
Record type|രേഖയുടെ തരം
Record details|രേഖയുടെ വിശദാംശങ്ങൾ
One thing to work towards|മുന്നോട്ട് പോകാനുള്ള ലക്ഷ്യം
How will you support this?|എങ്ങനെ പിന്തുണയ്ക്കും?
Review date|അവലോകന തീയതി
Measured on|അളന്ന തീയതി
Weight (kg)|ഭാരം (കിലോ)
Height (cm)|ഉയരം (സെ.മീ)
Vaccine name|വാക്സിന്റെ പേര്
Given on|നൽകിയ തീയതി
Next due|അടുത്ത തീയതി
Notes|കുറിപ്പുകൾ
Practitioner|വിദഗ്ധൻ
Session date & time|സെഷൻ തീയതിയും സമയവും
Home activities and session notes|വീട്ടിലെ പ്രവർത്തനങ്ങളും സെഷൻ കുറിപ്പുകളും
Status|നില
DEVELOPMENTAL MILESTONES|വളർച്ചാ നാഴികക്കല്ലുകൾ
Your child’s early development is a journey|നിങ്ങളുടെ കുട്ടിയുടെ ആദ്യകാല വളർച്ച ഒരു യാത്രയാണ്
Check off the milestones your child has reached and share their progress with the doctor at every visit.|നിങ്ങളുടെ കുട്ടി കൈവരിച്ച നാഴികക്കല്ലുകൾ അടയാളപ്പെടുത്തി ഓരോ സന്ദർശനത്തിലും ഡോക്ടറുമായി പുരോഗതി പങ്കിടുക.
Saved checkmarks appear in your child’s observations and reports for the care team.|സൂക്ഷിച്ച അടയാളങ്ങൾ പരിചരണ സംഘത്തിനായി നിങ്ങളുടെ കുട്ടിയുടെ നിരീക്ഷണങ്ങളിലും റിപ്പോർട്ടുകളിലും കാണാം.
milestones marked as reached|കൈവരിച്ചതായി അടയാളപ്പെടുത്തിയ നാഴികക്കല്ലുകൾ
Milestones marked as reached|കൈവരിച്ചതായി അടയാളപ്പെടുത്തിയ നാഴികക്കല്ലുകൾ
For this child|ഈ കുട്ടിക്ക് അനുയോജ്യം
These parent-entered checkmarks are read-only in the care team view.|രക്ഷിതാവ് രേഖപ്പെടുത്തിയ ഈ അടയാളങ്ങൾ പരിചരണ സംഘത്തിന്റെ കാഴ്ചയിൽ വായിക്കാൻ മാത്രം സാധിക്കും.
Milestone marked as not yet reached.|നാഴികക്കല്ല് ഇതുവരെ കൈവരിച്ചിട്ടില്ലെന്ന് അടയാളപ്പെടുത്തി.
Milestone saved for your care team.|നാഴികക്കല്ല് നിങ്ങളുടെ പരിചരണ സംഘത്തിനായി സൂക്ഷിച്ചു.
These are a few of many developmental milestones. They are for developmental monitoring only, not screening or diagnosis.|ഇവ നിരവധി വളർച്ചാ നാഴികക്കല്ലുകളിൽ ചിലത് മാത്രം. ഇവ വളർച്ച നിരീക്ഷിക്കാനാണ്; സ്ക്രീനിംഗിനോ രോഗനിർണയത്തിനോ വേണ്ടിയല്ല.
View the CDC Milestone Tracker|CDC Milestone Tracker കാണുക
Progress and home activities|പുരോഗതിയും വീട്ടിലെ പ്രവർത്തനങ്ങളും
Starts at|തുടങ്ങുന്ന സമയം
Ends at|അവസാനിക്കുന്ന സമയം
Send to|സ്വീകർത്താവ്
Message|സന്ദേശം
Specialist, center or service|വിദഗ്ധൻ, കേന്ദ്രം അല്ലെങ്കിൽ സേവനം
Reason for referral|റഫറലിന്റെ കാരണം
Corrected record|തിരുത്തിയ രേഖ
Reason for amendment|തിരുത്തലിന്റെ കാരണം
Information to share|പങ്കിടേണ്ട വിവരങ്ങൾ
Purpose of sharing|പങ്കിടലിന്റെ ഉദ്ദേശ്യം
Access expires|അനുമതി അവസാനിക്കുന്ന സമയം
Child’s name|കുട്ടിയുടെ പേര്
Date of birth|ജനന തീയതി
Preferred language|ഇഷ്ടപ്പെട്ട ഭാഷ
Name|പേര്
Guardian email|രക്ഷിതാവിന്റെ ഇമെയിൽ
Relationship|ബന്ധം
May this guardian share records?|ഈ രക്ഷിതാവിന് രേഖകൾ പങ്കിടാമോ?
Caregiver permissions|പരിചാരകന്റെ അനുമതികൾ
Request type|അഭ്യർത്ഥനയുടെ തരം
Tell us more|കൂടുതൽ വിവരിക്കുക
Professional name|വിദഗ്ധന്റെ പേര്
Profession|തൊഴിൽ
Specialty|വൈദഗ്ധ്യം
Professional registration number|പ്രൊഫഷണൽ രജിസ്ട്രേഷൻ നമ്പർ
Consultation languages|കൂടിക്കാഴ്ചയുടെ ഭാഷകൾ
Consultation fee in paise (₹1 = 100 paise)|കൂടിക്കാഴ്ച ഫീസ് പൈസയിൽ (₹1 = 100 പൈസ)
Professional background|പ്രൊഫഷണൽ പശ്ചാത്തലം
Decision|തീരുമാനം
Evidence and review reason|തെളിവും പരിശോധനാ കാരണവും
Title|ശീർഷകം
Type|തരം
Language|ഭാഷ
Accessible summary / text alternative|ലളിതമായ സംഗ്രഹം / പകരം വാചകം
Article or YouTube URL|ലേഖനത്തിന്റെ അല്ലെങ്കിൽ YouTube വിലാസം
Supporting source URL|പിന്തുണയ്ക്കുന്ന സ്രോതസ്സിന്റെ വിലാസം
Clinical and language review notes|ചികിത്സാ, ഭാഷാ പരിശോധനാ കുറിപ്പുകൾ
Response and evidence|മറുപടിയും തെളിവും
New consultation time|പുതിയ കൂടിക്കാഴ്ച സമയം
Resource name|സ്രോതസ്സിന്റെ പേര്
Resource type|സ്രോതസ്സിന്റെ തരം
Location|സ്ഥലം
Summary|സംഗ്രഹം
Official website|ഔദ്യോഗിക വെബ്സൈറ്റ്
observed|നിരീക്ഷിച്ചു
not yet|ഇതുവരെ ഇല്ല
unsure|ഉറപ്പില്ല
lost|നഷ്ടപ്പെട്ടു
communication|ആശയവിനിമയം
social|സാമൂഹികം
motor|ചലനം
daily living|ദൈനംദിന ജീവിതം
sensory|ഇന്ദ്രിയാനുഭവം
active|സജീവം
achieved|നേടി
paused|താൽക്കാലികമായി നിർത്തി
scheduled|സമയമിട്ടു
completed|പൂർത്തിയായി
cancelled|റദ്ദാക്കി
confirmed|സ്ഥിരീകരിച്ചു
awaiting payment|പണമടയ്ക്കാൻ കാത്തിരിക്കുന്നു
draft|കരട്
signed|ഒപ്പിട്ടു
revoked|പിൻവലിച്ചു
expired|കാലാവധി കഴിഞ്ഞു
pending|കാത്തിരിക്കുന്നു
approved|അംഗീകരിച്ചു
rejected|നിരസിച്ചു
suspended|താൽക്കാലികമായി വിലക്കി
quarantined|ക്വാറന്റൈനിൽ
clean|സുരക്ഷിതം
unavailable|ലഭ്യമല്ല
captured|പണമടച്ചു
refunded|തിരികെ നൽകി
created|സൃഷ്ടിച്ചു
reviewed|പരിശോധിച്ചു
follow up required|തുടർപരിശോധന ആവശ്യമാണ്
in review|പരിശോധനയിൽ
resolved|പരിഹരിച്ചു
open|തുറന്നിരിക്കുന്നു
invited|ക്ഷണിച്ചു
parent|മാതാപിതാവ്
guardian|രക്ഷിതാവ്
caregiver|പരിചാരകൻ
doctor|ഡോക്ടർ
therapist|തെറാപ്പിസ്റ്റ്
mentor|മെന്റർ
admin|നിർവാഹകൻ
note|കുറിപ്പ്
report|റിപ്പോർട്ട്
assessment|വിലയിരുത്തൽ
prescription|കുറിപ്പടി
article|ലേഖനം
video|വീഡിയോ
correction|തിരുത്തൽ
export|പകർപ്പ്
deletion|ഇല്ലാതാക്കൽ
complaint|പരാതി
adult transition|പ്രായപൂർത്തിയിലേക്കുള്ള മാറ്റം
Amendment ·|ഭേദഗതി ·
Care sections|പരിചരണ വിഭാഗങ്ങൾ
Care tools|പരിചരണ ഉപകരണങ്ങൾ
Delivery queues & payment disputes|അറിയിപ്പ് ക്യൂകളും പണമിടപാട് തർക്കങ്ങളും
Disable account|അക്കൗണ്ട് പ്രവർത്തനരഹിതമാക്കുക
English|ഇംഗ്ലീഷ്
Evidence|തെളിവ്
Hold expires|താൽക്കാലിക സംവരണത്തിന്റെ കാലാവധി അവസാനിക്കും
Main navigation|പ്രധാന നാവിഗേഷൻ
Message to Nest assistant|നെസ്റ്റ് സഹായിയ്ക്കുള്ള സന്ദേശം
Message to Nest Assistant|നെസ്റ്റ് അസിസ്റ്റന്റിനുള്ള സന്ദേശം
Mobile navigation|മൊബൈൽ നാവിഗേഷൻ
More|കൂടുതൽ
No queue items need review|പരിശോധിക്കേണ്ട ക്യൂ ഇനങ്ങളില്ല
Load more queue items|കൂടുതൽ ക്യൂ ഇനങ്ങൾ കാണിക്കുക
Private consultation|സ്വകാര്യ കൂടിക്കാഴ്ച
Recorded weight measurements over time|കാലക്രമത്തിൽ രേഖപ്പെടുത്തിയ ഭാരമളവുകൾ
Restore account|അക്കൗണ്ട് പുനഃസ്ഥാപിക്കുക
Retry delivery|അയയ്ക്കൽ വീണ്ടും ശ്രമിക്കുക
Review deletion|ഇല്ലാതാക്കൽ പരിശോധിക്കുക
Review dispute|തർക്കം പരിശോധിക്കുക
Review transfer|കൈമാറ്റം പരിശോധിക്കുക
Revoke transfer|കൈമാറ്റം പിൻവലിക്കുക
Search learning resources|പഠന സ്രോതസ്സുകൾ തിരയുക
Search specialists|വിദഗ്ധരെ തിരയുക
Send message|സന്ദേശം അയയ്ക്കുക
Start transition|മാറ്റം ആരംഭിക്കുക
This child|ഈ കുട്ടി
Verified care professional|പരിശോധിച്ച് സ്ഥിരീകരിച്ച പരിചരണ വിദഗ്ധൻ
Consultation|കൂടിക്കാഴ്ച
Fee|ഫീസ്
Timezone|സമയമേഖല
Select a date|ഒരു തീയതി തിരഞ്ഞെടുക്കുക
Previous available month|ലഭ്യമായ മുൻ മാസം
Next available month|ലഭ്യമായ അടുത്ത മാസം
Available|ലഭ്യമാണ്
Select a time|ഒരു സമയം തിരഞ്ഞെടുക്കുക
Select an available day to see times.|സമയങ്ങൾ കാണാൻ ലഭ്യമായ ഒരു ദിവസം തിരഞ്ഞെടുക്കുക.
Available times|ലഭ്യമായ സമയങ്ങൾ
minutes|മിനിറ്റ്
No times available for this date.|ഈ തീയതിക്ക് സമയങ്ങളൊന്നും ലഭ്യമല്ല.
Review your appointment|നിങ്ങളുടെ കൂടിക്കാഴ്ച പരിശോധിക്കുക
Your appointment|നിങ്ങളുടെ കൂടിക്കാഴ്ച
For|ആർക്കായി
Length|ദൈർഘ്യം
Back to schedule|ഷെഡ്യൂളിലേക്ക് മടങ്ങുക
Continue to review|പരിശോധിക്കാൻ തുടരുക
Choose a time to review your appointment details.|കൂടിക്കാഴ്ചയുടെ വിവരങ്ങൾ പരിശോധിക്കാൻ ഒരു സമയം തിരഞ്ഞെടുക്കുക.
Update appointment|കൂടിക്കാഴ്ച പുതുക്കുക
Back to appointments|കൂടിക്കാഴ്ചകളിലേക്ക് മടങ്ങുക
Choose a new time|പുതിയ സമയം തിരഞ്ഞെടുക്കുക
Schedule a consultation|ഒരു കൂടിക്കാഴ്ച നിശ്ചയിക്കുക
Your existing consultation is moved only after the replacement is secured.|പകരം സമയം ഉറപ്പായതിനുശേഷം മാത്രമേ നിലവിലെ കൂടിക്കാഴ്ച മാറ്റുകയുള്ളൂ.
Confirm appointment change?|കൂടിക്കാഴ്ചയുടെ മാറ്റം സ്ഥിരീകരിക്കണോ?
Consultation rescheduled.|കൂടിക്കാഴ്ചയുടെ സമയം മാറ്റി.
per consultation. All times shown in your local timezone.|ഓരോ കൂടിക്കാഴ്ചയ്ക്കും. എല്ലാ സമയവും നിങ്ങളുടെ പ്രാദേശിക സമയമേഖലയിലാണ് കാണിക്കുന്നത്.
workspace|പ്രവർത്തനസ്ഥലം
· Expires|· കാലാവധി അവസാനിക്കും
· Reviewed|· പരിശോധിച്ചു
Yes|അതെ
No|ഇല്ല
A thoughtful check-in, at your pace.|നിങ്ങളുടെ വേഗത്തിൽ ചിന്തിച്ചുള്ള ഒരു ചെക്ക്-ഇൻ.
Your reflections can support a conversation with your care team. This check-in does not diagnose autism or create an AI score.|നിങ്ങളുടെ പരിചരണ സംഘവുമായുള്ള സംഭാഷണത്തിന് നിങ്ങളുടെ നിരീക്ഷണങ്ങൾ സഹായകരമാകും. ഈ ചെക്ക്-ഇൻ ഓട്ടിസം രോഗനിർണയമോ എഐ സ്കോറോ സൃഷ്ടിക്കുന്നില്ല.
Parent questionnaire|രക്ഷിതൃ ചോദ്യാവലി
This check-in is available in a child’s family account.|ഈ ചെക്ക്-ഇൻ കുട്ടിയുടെ കുടുംബ അക്കൗണ്ടിലാണ് ലഭിക്കുക.
Choose a child profile first|ആദ്യം ഒരു കുട്ടിയുടെ പ്രൊഫൈൽ തിരഞ്ഞെടുക്കുക
Select a child to begin a parent questionnaire.|രക്ഷിതൃ ചോദ്യാവലി ആരംഭിക്കാൻ ഒരു കുട്ടിയെ തിരഞ്ഞെടുക്കുക.
PARENT QUESTIONNAIRE|രക്ഷിതൃ ചോദ്യാവലി
Your reflections are saved.|നിങ്ങളുടെ നിരീക്ഷണങ്ങൾ സംരക്ഷിച്ചു.
This check-in is parent-entered information only. It does not provide a diagnosis, prediction, or AI score.|ഈ ചെക്ക്-ഇൻ രക്ഷിതാവ് നൽകിയ വിവരങ്ങൾ മാത്രമാണ്. ഇത് രോഗനിർണയമോ പ്രവചനമോ എഐ സ്കോറോ നൽകുന്നില്ല.
Back to journey|വളർച്ചയിലേക്ക് മടങ്ങുക
Start another check-in|മറ്റൊരു ചെക്ക്-ഇൻ ആരംഭിക്കുക
Back|തിരികെ
Take one section at a time. Choose what feels closest to your everyday experience.|ഓരോ വിഭാഗവും ഓരോന്നായി ചെയ്യുക. നിങ്ങളുടെ ദൈനംദിന അനുഭവത്തോട് ഏറ്റവും ചേർന്നത് തിരഞ്ഞെടുക്കുക.
Section|വിഭാഗം
Questionnaire progress|ചോദ്യാവലിയുടെ പുരോഗതി
Choose the option that best reflects what you notice day to day.|ദിവസേന നിങ്ങൾ ശ്രദ്ധിക്കുന്നതിനെ ഏറ്റവും നന്നായി പ്രതിഫലിപ്പിക്കുന്ന ഓപ്ഷൻ തിരഞ്ഞെടുക്കുക.
Never|ഒരിക്കലും ഇല്ല
Sometimes|ചിലപ്പോൾ
Often|പലപ്പോഴും
Almost always|മിക്കവാറും എല്ലായ്പ്പോഴും
I’m concerned|എനിക്ക് ആശങ്കയുണ്ട്
Your answers are saved as parent-entered information only. No diagnosis or AI result is generated.|നിങ്ങളുടെ ഉത്തരങ്ങൾ രക്ഷിതാവ് നൽകിയ വിവരങ്ങളായി മാത്രം സംരക്ഷിക്കുന്നു. രോഗനിർണയമോ എഐ ഫലമോ സൃഷ്ടിക്കില്ല.
Previous|മുമ്പത്തേത്
Next|അടുത്തത്
Save check-in|ചെക്ക്-ഇൻ സംരക്ഷിക്കുക
Parent questionnaire saved.|രക്ഷിതൃ ചോദ്യാവലി സംരക്ഷിച്ചു.
SAVED CHECK-INS|സംരക്ഷിച്ച ചെക്ക്-ഇനുകൾ
Previous parent questionnaires|മുമ്പത്തെ രക്ഷിതൃ ചോദ്യാവലികൾ
Developmental check-in|വളർച്ചാ ചെക്ക്-ഇൻ
sections recorded|വിഭാഗങ്ങൾ രേഖപ്പെടുത്തി
Communication & language|ആശയവിനിമയവും ഭാഷയും
Play & everyday routines|കളിയും ദൈനംദിന ശീലങ്ങളും
Movement & coordination|ചലനവും ഏകോപനവും
Feelings, sleep & regulation|വികാരങ്ങൾ, ഉറക്കം, നിയന്ത്രണം
How often does your child use words, sounds, signs, or other ways to share an idea or need?|നിങ്ങളുടെ കുട്ടി ഒരു ആശയമോ ആവശ്യമോ പങ്കിടാൻ വാക്കുകൾ, ശബ്ദങ്ങൾ, അടയാളങ്ങൾ, അല്ലെങ്കിൽ മറ്റേതെങ്കിലും മാർഗങ്ങൾ എത്രത്തോളം ഉപയോഗിക്കുന്നു?
How often does your child respond in a way that feels comfortable for them when someone they know tries to connect?|പരിചിതനായ ഒരാൾ ബന്ധപ്പെടാൻ ശ്രമിക്കുമ്പോൾ, കുട്ടിക്ക് സൗകര്യപ്രദമായ രീതിയിൽ എത്രത്തോളം പ്രതികരിക്കുന്നു?
How often does your child show, share, or invite someone into an activity they enjoy?|കുട്ടി ഇഷ്ടപ്പെടുന്ന ഒരു പ്രവർത്തനം കാണിക്കുകയോ പങ്കിടുകയോ മറ്റൊരാളെ അതിൽ പങ്കെടുപ്പിക്കുകയോ എത്രത്തോളം ചെയ്യുന്നു?
How often do sounds, touch, movement, or changes in the environment make everyday activities harder?|ശബ്ദം, സ്പർശം, ചലനം, അല്ലെങ്കിൽ പരിസരത്തിലെ മാറ്റങ്ങൾ ദൈനംദിന കാര്യങ്ങൾ ബുദ്ധിമുട്ടാക്കുന്നത് എത്രത്തോളം സംഭവിക്കുന്നു?
How often does your child need extra support with movement, coordination, or everyday tasks?|ചലനം, ഏകോപനം, അല്ലെങ്കിൽ ദൈനംദിന പ്രവർത്തനങ്ങൾക്കായി കുട്ടിക്ക് അധിക പിന്തുണ ആവശ്യമാകുന്നത് എത്രത്തോളം സംഭവിക്കുന്നു?
How often does your child need extra support to settle after feeling overwhelmed, upset, or tired?|അമിതമായി തോന്നിയശേഷമോ വിഷമിച്ചശേഷമോ ക്ഷീണിച്ചശേഷമോ ശാന്തമാകാൻ കുട്ടിക്ക് അധിക പിന്തുണ ആവശ്യമാകുന്നത് എത്രത്തോളം സംഭവിക്കുന്നു?
Suggest activities for my child|എന്റെ കുട്ടിക്ക് അനുയോജ്യമായ കളികൾ നിർദ്ദേശിക്കൂ
Choose a child with a valid date of birth to get activity suggestions.|കളികൾ നിർദ്ദേശിക്കാൻ ശരിയായ ജനനത്തീയതിയുള്ള കുട്ടിയുടെ പ്രൊഫൈൽ തിരഞ്ഞെടുക്കുക.
Your latest check-in reports a lost skill. Contact a qualified healthcare professional promptly. Do not wait for games or an assistant reply.|അവസാന ചെക്ക്-ഇനിൽ മുമ്പുണ്ടായിരുന്ന ഒരു കഴിവ് നഷ്ടപ്പെട്ടതായി രേഖപ്പെടുത്തിയിട്ടുണ്ട്. യോഗ്യതയുള്ള ആരോഗ്യവിദഗ്ധനെ ഉടൻ ബന്ധപ്പെടുക. കളികൾക്കോ അസിസ്റ്റന്റിന്റെ മറുപടിക്കോ കാത്തിരിക്കരുത്.
From your check-in|നിങ്ങളുടെ ചെക്ക്-ഇനിൽ നിന്ന്
Selected for their age|കുട്ടിയുടെ പ്രായത്തിന് അനുയോജ്യമായി തിരഞ്ഞെടുത്തത്
I couldn’t load the saved check-in. These suggestions use age only.|സൂക്ഷിച്ച ചെക്ക്-ഇൻ ലഭ്യമാക്കാനായില്ല. ഈ നിർദ്ദേശങ്ങൾ പ്രായത്തെ മാത്രം അടിസ്ഥാനമാക്കിയുള്ളതാണ്.
These suggestions use age only. Complete a milestone check-in for suggestions based on your answers.|ഈ നിർദ്ദേശങ്ങൾ പ്രായത്തെ മാത്രം അടിസ്ഥാനമാക്കിയുള്ളതാണ്. ഉത്തരങ്ങൾ അനുസരിച്ചുള്ള നിർദ്ദേശങ്ങൾക്കായി വളർച്ചാ ചെക്ക്-ഇൻ പൂർത്തിയാക്കുക.
Your saved check-in is from an earlier age group. These suggestions use the current age; complete a new check-in to update them.|സൂക്ഷിച്ച ചെക്ക്-ഇൻ മുൻ പ്രായവിഭാഗത്തിൽ നിന്നുള്ളതാണ്. ഈ നിർദ്ദേശങ്ങൾ ഇപ്പോഴത്തെ പ്രായം അനുസരിച്ചുള്ളതാണ്; പുതുക്കാൻ പുതിയ ചെക്ക്-ഇൻ പൂർത്തിയാക്കുക.
These suggestions use the current age and your latest saved milestone answers. Skills marked In progress, Not yet or Not sure guide the play choices.|ഇപ്പോഴത്തെ പ്രായവും അവസാനം സൂക്ഷിച്ച വളർച്ചാ ഉത്തരങ്ങളും അനുസരിച്ചാണ് ഈ നിർദ്ദേശങ്ങൾ. പുരോഗമിക്കുന്നു, ഇതുവരെ ഇല്ല, ഉറപ്പില്ല എന്ന ഉത്തരങ്ങൾ കളികൾ തിരഞ്ഞെടുക്കാൻ ഉപയോഗിക്കുന്നു.
Your latest saved answers mark the listed skills as observed. Here are age-matched ways to keep playing together.|അവസാനം സൂക്ഷിച്ച ഉത്തരങ്ങളിൽ പട്ടികയിലെ കഴിവുകൾ കണ്ടതായി രേഖപ്പെടുത്തിയിട്ടുണ്ട്. ഒരുമിച്ച് കളിക്കാൻ പ്രായത്തിന് അനുയോജ്യമായ ചില ആശയങ്ങൾ ഇതാ.
You reported a concern. Share it with your care professional; play suggestions do not replace a review.|നിങ്ങൾ ഒരു ആശങ്ക രേഖപ്പെടുത്തിയിട്ടുണ്ട്. അത് ആരോഗ്യവിദഗ്ധനുമായി പങ്കിടുക; കളികളുടെ നിർദ്ദേശങ്ങൾ വിദഗ്ധ പരിശോധനയ്ക്ക് പകരമല്ല.
Activity suggestions use saved check-ins within NeuroNest. Only your typed messages go to the chat service.|കളികൾ നിർദ്ദേശിക്കാൻ സൂക്ഷിച്ച ചെക്ക്-ഇനുകൾ NeuroNest-നുള്ളിൽ ഉപയോഗിക്കുന്നു. നിങ്ങൾ ടൈപ്പ് ചെയ്യുന്ന സന്ദേശങ്ങൾ മാത്രം ചാറ്റ് സേവനത്തിലേക്ക് അയയ്ക്കുന്നു.
Check payment status|പണമടച്ച നില പരിശോധിക്കുക
Payment status checked.|പണമടച്ച നില പരിശോധിച്ചു.
Unable to load availability. Please try again.|ലഭ്യമായ സമയങ്ങൾ ലഭ്യമാക്കാനായില്ല. വീണ്ടും ശ്രമിക്കുക.
Loading doctors…|ഡോക്ടർമാരുടെ വിവരങ്ങൾ ലഭ്യമാക്കുന്നു…
General pediatrics|പൊതു ശിശുരോഗ വിഭാഗം
Developmental pediatrics|ശിശു വികാസ ചികിത്സാ വിഭാഗം
Pediatric neurology|ശിശു ന്യൂറോളജി
Child psychiatry|ശിശു മനോരോഗ വിഭാഗം
Fictional project-demo profile. Test bookings only; no medical consultation. Monday–Friday, 10:30 am–3 pm IST; lunch 12:30–1:30 pm. 30-minute slots.|പ്രോജക്റ്റ് പ്രദർശനത്തിനുള്ള സാങ്കൽപ്പിക പ്രൊഫൈൽ. പരീക്ഷണ ബുക്കിങ്ങുകൾ മാത്രം; വൈദ്യപരിശോധന ലഭ്യമല്ല. തിങ്കൾ–വെള്ളി, രാവിലെ 10:30–വൈകിട്ട് 3 വരെ; ഉച്ചഭക്ഷണ ഇടവേള 12:30–1:30. ഓരോ സമയവും 30 മിനിറ്റ്.
`
    .trim()
    .split("\n")
    .map((line) => {
      const [key, ...value] = line.split("|");
      return [key, value.join("|")];
    }),
);
export function translate(text: string, language: Language): string {
  return language === "ml" ? malayalam[text.trim()] || text : text;
}
export function useTranslation() {
  const language = useContext(LanguageContext);
  return (text: string) => translate(text, language);
}
