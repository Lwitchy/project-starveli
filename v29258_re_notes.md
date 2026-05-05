# Reverse Engineering Context (v29.258)

Here is everything I learned about `ClubMailPopup` structure, input handling, and the internal UI framework via MCP cross-referencing and dynamic analysis:


### 2. Why the "Send" Button Fired Blanks (CallToActionButton)
The Send button natively found in `ClubMailPopup` is NOT a standard generic `GUIButton`. MCP analysis reveals the following mechanics:
- During `ClubMailPopup` construction, the "join_button" UI definition is structurally wrapped into a strictly handled `CallToActionButton`.
- `CallToActionButton` assigns its own internal `InputListener`, meaning taps are swallowed natively and DO NOT bubble up to the generic `GUI_Popup::buttonPressed` routing handler (`0x4DF860`).
- When pressed, it natively tries to construct and dispatch a `SendAllianceMailMessage` class. Because the user is spawning the UI out-of-context on the Login screen, the pre-checks inside `LogicAlliance::canSendMail` immediately reject it, returning an error internally that cancels the `GUI_Popup::close` execution tree entirely. The UI just sits there.

### 3. Native Data Extraction & Memory Architecture
Extracting the string natively was highly successful. The internal memory layout for `ClubMailPopup` remains extremely rigid and predictable in `v29.258`:
- `popup + (252)` (`0xFC`): A strict pointer to the `TextInput` class instance.
- `TextInput + (128)` (`0x80`): A pointer to the Supercell internal String object.
- Because the native `X` button inherits generic standard popup behavior, its click cleanly triggers `GUI_Popup::buttonPressed` and ultimately vectors to `ClubMailPopup::~ClubMailPopup` (`0x2DC224`). 

**Destructor Hooking**: Capturing data at the destructor offset serves as the perfect secure extraction anchor because it guarantees the text has fully finalized before UI memory garbage collection.

### 4. Overriding Behaviors
To make native UI injections work perfectly outside of generic destructions, we discovered that any dynamic UI hijack requires:
1. Searching the UI tree using `GUIComponent::getChildByName` (`0x27C934`) with a natively constructed `String` object.
2. Manually redirecting the vtable listener for specific buttons using `GUIButton::setClickListener` (`0x43BEB4`) back up to the `GUI_Popup` listener pointer (offset `+18`). Doing this safely without pointer mismatches requires verifying the Component inherits directly from `GUIButton` first.
