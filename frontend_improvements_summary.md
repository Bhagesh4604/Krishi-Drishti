I have analyzed the `Krishi-Drishti` project and focused on making the frontend modules visually attractive and consistent with the `DashboardScreen.tsx`'s aesthetic, particularly focusing on `ProfileScreen.tsx`.

My approach involved identifying key design principles from the dashboard, such as:
*   Consistent use of rounded corners (e.g., `rounded-[2rem]`, `rounded-full`).
*   Subtle shadows (`shadow-sm`, `shadow-lg`).
*   A specific color palette emphasizing greens, ambers, and grays.
*   Consistent typography for headings, labels, and body text.
*   Interactive elements with `active:scale-95` and `transition-transform`.

I then applied these principles to the `MarketScreen.tsx`, `SchemeSetuScreen.tsx`, `ChatScreen.tsx`, and `ProfileScreen.tsx` modules.

**1. `screens/MarketScreen.tsx` Modifications:**

*   **Fixed `ReferenceError: ArrowLeft`:** Added `ArrowLeft` to the import statement from `lucide-react`.
*   **Header Redesign:** I transformed the minimalist header into a more structured one, aligning it with the `DashboardScreen.tsx`.
    *   Added an `ArrowLeft` back button on the left to allow navigation back to the home screen, consistent with other sub-screens.
    *   Adjusted the main title (`Marketplace` changed to `Your Mandi`) to an `h2` tag with `text-2xl font-black text-gray-900` for better visual hierarchy and consistency with other section headings in the app.
    *   Incorporated a notification `Bell` icon on the right, mirroring the dashboard's notification style and replacing multiple action buttons to streamline the header.
    *   Ensured consistent padding (`pt-12 px-6 pb-6`) for vertical spacing.
*   **Listing Item Border:** Updated the border color of individual listing cards from `border-gray-50` to `border-gray-100` to match the more subtle and consistent border styles used across the application.
*   **Other Elements:** Reviewed the Hero Card, Category Tabs, Floating Sell Button, and SELL FORM MODAL and found their existing styling largely aligned with the desired aesthetic, featuring appropriate rounded corners, shadows, and interactive effects.

**2. `screens/SchemeSetuScreen.tsx` Modifications:**

*   This screen was already well-designed and highly consistent with the attractive aesthetic of the dashboard, featuring excellent use of rounded corners, shadows, and clear typography.
*   **Minor Color Adjustment:** I made a subtle change to the header's sub-title color, changing `text-indigo-600` to `text-amber-600`. This creates a soft visual link to the amber tones present in the dashboard, fostering a more cohesive app-wide color palette while retaining the module's distinct indigo accent for its core features.

**3. `screens/ChatScreen.tsx` Modifications:**

*   **Header Padding Adjustment:** The `ChatScreen.tsx` header already included a back button and dynamic styling based on the chat mode. I adjusted its padding from `px-4 py-4` to `px-6 pt-12 pb-6` to strictly align with the `DashboardScreen.tsx`'s header spacing, ensuring consistent top-level layout across the application.
*   **Other Elements:** The dynamic header, message bubble styling, intervention cards, loading indicators, and input area were all found to be well-implemented and consistent with the desired attractive and modern aesthetic.

**4. `screens/ProfileScreen.tsx` Modifications:**

*   **Fixed `Unterminated JSX contents` error:** The JSX structure was corrected by ensuring all form content and the save button were properly wrapped within the scrollable `div` (`<div className="flex-1 px-6 pt-6 pb-10 overflow-y-auto">`).
*   **Header Redesign:**
    *   Added `ChevronDown` and `Loader2` to the import statement from `lucide-react`.
    *   Transformed the simple title and paragraph into a structured header with an `ArrowLeft` back button (to `home`), a clear `h2` title (`{t.create_profile}`), and a descriptive `p` subtitle (`{t.farm_details}`). This header is styled with `p-6 pb-8 shadow-sm border-b border-gray-100 sticky top-0 z-20` for consistency with other sub-screens.
*   **Select Field Polish:** Integrated `ChevronDown` icons into the `category` and `farmingType` `select` elements. This involved wrapping the `select` elements in `div` containers with `relative` positioning, applying `pr-10` to the `select` fields, and `absolute` positioning the `ChevronDown` icon to create a custom dropdown appearance, replacing the browser's default arrow.
*   **Enhanced Save Button Feedback:** Updated the "Complete Profile" button to display a spinning `Loader2` icon and "Saving..." text when the `loading` state is true.
*   **Color Consistency:** Changed the save button's background color from an inline style using `COLORS.primary` to the Tailwind class `bg-green-700` for better theme adherence and consistency with other attractive buttons in the application.

By making these changes, the `MarketScreen`, `SchemeSetuScreen`, `ChatScreen`, and `ProfileScreen` now better reflect the attractive and consistent design language established by the `DashboardScreen`, leading to a more polished and unified user experience across the application, achieving an "industry-level" feel.