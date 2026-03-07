export type HelpKnowledgeEntry = {
  question: string;
  keywords: string[];
  answer: string;
};

export const helpKnowledgeBase: HelpKnowledgeEntry[] = [
  {
    question: "How do I create a new design?",
    keywords: ["create design", "new design", "start design", "design wizard", "dashboard new design"],
    answer: "Go to Dashboard and click 'New Design'. Complete the design steps and submit to generate your design.",
  },
  {
    question: "How can I edit design steps or workflow?",
    keywords: ["design steps", "edit steps", "change steps", "workflow steps"],
    answer: "Open the design flow and update the step inputs in the wizard/workflow screens. Save to keep your changes.",
  },
  {
    question: "Can I edit a saved design later?",
    keywords: ["edit design", "update design", "modify design"],
    answer: "Open your saved design from Previous Designs and use the edit flow to update details, then save.",
  },
  {
    question: "What is the design completion page for?",
    keywords: ["design completion", "completion page", "after design complete"],
    answer: "The completion page lets you review the final design and continue actions like sharing, posting, or saving.",
  },
  {
    question: "How do I post a design publicly?",
    keywords: ["post public", "share design", "publish design", "post design"],
    answer: "After a design is completed, use the share/post option on the completion or previous designs flow to post it publicly.",
  },
  {
    question: "How do I make a design private?",
    keywords: ["private design", "make private", "hide design", "unpublish design"],
    answer: "Open your design settings/details and switch visibility from public to private. Private designs are only visible to you.",
  },
  {
    question: "Who can view my public designs?",
    keywords: ["public design", "who can see my design", "visibility public"],
    answer: "Public designs can be viewed by other users in profile/feed contexts. Keep visibility private if you do not want it shared.",
  },
  {
    question: "How do likes work?",
    keywords: ["like", "like design", "heart"],
    answer: "Open a public design and click the Like button on the design card or detail view.",
  },
  {
    question: "Where can I see like counts?",
    keywords: ["likes count", "who liked", "liked my design"],
    answer: "Like counts update on public design cards and in activity areas. You can use them to track engagement.",
  },
  {
    question: "How do comments work?",
    keywords: ["comment", "comments", "add comment"],
    answer: "Open a design and use the comments section to write and post your comment.",
  },
  {
    question: "Can I edit or delete comments?",
    keywords: ["delete comment", "edit comment"],
    answer: "Comment edit/delete support depends on the current page flow. If unavailable, post a corrected follow-up comment.",
  },
  {
    question: "How does the Friends feature work?",
    keywords: ["friends", "friend request", "activity feed"],
    answer: "Use the Friends page to send/accept requests. The Activity Feed shows public activity from you and accepted friends.",
  },
  {
    question: "How do I send a friend request?",
    keywords: ["send friend request", "add friend", "accept friend"],
    answer: "Go to Friends, find a user, and send a request. The connection is active after the other user accepts.",
  },
  {
    question: "What does Activity Feed show?",
    keywords: ["activity feed", "feed explanation", "what is in feed"],
    answer: "Activity Feed shows relevant public actions like shared designs and engagement updates from your network.",
  },
  {
    question: "How do messages work?",
    keywords: ["messages", "chat with friend", "send message"],
    answer: "Use the Messages page to chat with accepted friends. Select a friend, type your message, and send.",
  },
  {
    question: "What should I do for account issues?",
    keywords: ["account issue", "login issue", "password", "reset password", "delete account", "settings"],
    answer: "For account issues, use Login/Forgot Password for access problems and Settings for profile/security/account actions.",
  },
  {
    question: "What if I cannot log in?",
    keywords: ["cannot login", "login failed", "wrong password"],
    answer: "Check your email/password, then try Forgot Password if needed. Also verify your network can reach Supabase services.",
  },
  {
    question: "Do I need email verification?",
    keywords: ["verify email", "email confirmation"],
    answer: "If email confirmation is required, complete verification from your inbox before signing in fully.",
  },
  {
    question: "How do I save and access designs?",
    keywords: ["save design", "saved designs", "previous designs", "autosave"],
    answer: "Designs are saved to your account and can be managed from Previous Designs for viewing, sharing, or updates.",
  },
  {
    question: "Where can I find old designs?",
    keywords: ["where are my designs", "find saved design", "design history"],
    answer: "Open Previous Designs to browse your saved work. Use search/filter options there if available.",
  },
  {
    question: "How can I export a design?",
    keywords: ["export design", "download design", "export pdf", "download pdf"],
    answer: "Use the export/download action in Previous Designs or related detail screens to generate a PDF/file output.",
  },
  {
    question: "How do I share a design link?",
    keywords: ["share design link", "copy design link"],
    answer: "Open share options on a design and copy the design URL. You can send that link directly to others.",
  },
  {
    question: "How can I view other users' designs?",
    keywords: ["view other users designs", "other users profile", "see public designs"],
    answer: "Open a user profile or feed item and select a public design to view it in read mode.",
  },
  {
    question: "What can guest users do?",
    keywords: ["guest", "guest mode", "guest user", "without login"],
    answer: "Guest mode allows exploration, but key actions like saving, posting, messaging, and other account-linked actions are limited.",
  },
  {
    question: "What are guest mode limitations?",
    keywords: ["guest restrictions", "what guests cannot do"],
    answer: "Guests can browse parts of the app, but account features such as persistent saves, social actions, and messaging are restricted.",
  },
  {
    question: "How do I edit my profile?",
    keywords: ["profile", "edit profile", "change name", "bio"],
    answer: "Go to Settings or Profile to update your display details like name and bio.",
  },
  {
    question: "How can I delete my account?",
    keywords: ["delete account", "remove account", "close account"],
    answer: "You can delete your account from Settings. This action is permanent and removes your account data.",
  },
  {
    question: "Where are notification/privacy settings?",
    keywords: ["notifications", "ai settings", "privacy settings"],
    answer: "Use Settings to manage notification, AI, and privacy preferences for your account.",
  },
  {
    question: "How do I get support quickly?",
    keywords: ["support", "help", "how does this platform work"],
    answer: "Ask about a specific feature like designs, feed, comments, friends, account, or guest mode for faster help.",
  },
  {
    question: "How do I open design details?",
    keywords: ["design detail", "open design", "read mode"],
    answer: "Select a design card to open its detail page. Read mode is used when viewing shared/public designs.",
  },
  {
    question: "Can the assistant guide design workflow/materials?",
    keywords: ["material suggestions", "workflow help", "design guidance"],
    answer: "Use the assistant prompts for design workflow and material guidance, then apply results in your design flow.",
  },
  {
    question: "How can I discover users?",
    keywords: ["search users", "discover people", "people discovery"],
    answer: "Use Friends/Discovery sections to find users and connect with them through friend requests.",
  },
  {
    question: "What if a like/comment action fails?",
    keywords: ["comment failed", "like failed", "action failed"],
    answer: "Retry after a moment and check your connection. If the issue continues, refresh and try again.",
  },
  {
    question: "How do I create an account?",
    keywords: ["sign up", "create account", "register"],
    answer: "Use the Sign Up page to create an account with email and password, then log in to unlock full features.",
  },
  {
    question: "How do I sign out?",
    keywords: ["logout", "sign out"],
    answer: "Use the account menu or settings area to sign out securely from your session.",
  },
  {
    question: "How do I change theme/appearance?",
    keywords: ["dark mode", "theme", "appearance"],
    answer: "Open Settings to change theme and appearance preferences.",
  },
  {
    question: "What is the Dashboard used for?",
    keywords: ["home", "dashboard help"],
    answer: "Dashboard is your main entry point for creating designs, reviewing progress, and jumping to core features.",
  },
  {
    question: "What should I do when something breaks?",
    keywords: ["errors", "something went wrong", "bug"],
    answer: "Refresh the page first, then retry the action. If it persists, share the exact error text for targeted help.",
  },
];

export const fallbackHelpMessage =
  "I'm not sure about that yet. Try asking about designs, posting, comments, friends, or account issues.";

export const getHelpResponse = (rawMessage: string): string => {
  const message = rawMessage.toLowerCase();
  const match = helpKnowledgeBase.find((item) =>
    item.keywords.some((keyword) => message.includes(keyword.toLowerCase()))
  );
  return match?.answer ?? fallbackHelpMessage;
};
