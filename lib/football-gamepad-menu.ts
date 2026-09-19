/** Operates the actual visible controls, preserving the existing menu handlers. */
export function navigateGamepadMenu(action: "up" | "down" | "left" | "right" | "confirm" | "back" | "pause") {
  const visible = (element: Element) => {
    const r=element.getBoundingClientRect();
    return r.width>0 && r.height>0 && getComputedStyle(element).visibility!=="hidden";
  };
  const dialogs=Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).filter(visible);
  const scope=dialogs.at(-1) ?? document.querySelector<HTMLElement>('.menu-panel, .finish-card');
  if(!scope)return;
  const elements=Array.from(scope.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),input:not(:disabled),[role="radio"],[role="switch"]'))
    .filter(e=>visible(e) && e.getAttribute("aria-hidden")!=="true" && e.tabIndex>=0);
  if(!elements.length)return;
  let current=elements.indexOf(document.activeElement as HTMLElement);
  if(action==="back") {
    const close=elements.find(e=>e.getAttribute("aria-label")==="Close" || e.textContent?.trim()==="Close");
    close?.click();return;
  }
  if(action==="pause") {
    const primary=elements.find(e=>/^(CONTINUAR|JOGAR AGORA|SALVAR E VOLTAR|VOLTAR AO MENU)/.test(e.textContent?.trim()??""));
    primary?.click();return;
  }
  if(current<0) {
    current=action==="confirm" ? Math.max(0,elements.findIndex(e=>e.classList.contains("play-button"))) : 0;
    focusControl(elements[current]);if(action!=="confirm")return;
  }
  const element=elements[current];
  if(action==="confirm") { element.click();return; }
  if(element.getAttribute("role")==="radio" && (action==="left"||action==="right")) {
    const options=Array.from(element.closest('[role="radiogroup"]')?.querySelectorAll<HTMLElement>('[role="radio"]:not(:disabled)')??[]).filter(visible);
    const index=options.indexOf(element);
    if(index>=0 && options.length) {
      const next=options[(index+(action==="right"?1:-1)+options.length)%options.length];
      next.click();focusControl(next);return;
    }
  }
  if(element instanceof HTMLSelectElement && (action==="left"||action==="right")) {
    const next=Math.max(0,Math.min(element.options.length-1,element.selectedIndex+(action==="right"?1:-1)));
    element.selectedIndex=next;element.dispatchEvent(new Event("change",{bubbles:true}));return;
  }
  const next=(current+(action==="up"||action==="left"?-1:1)+elements.length)%elements.length;
  focusControl(elements[next]);
}

function focusControl(element: HTMLElement) {
  document.querySelector('[data-gamepad-focus]')?.removeAttribute('data-gamepad-focus');
  element.setAttribute('data-gamepad-focus','true');element.focus();element.scrollIntoView({block:'nearest'});
}
