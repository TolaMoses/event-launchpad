export interface TelegramTaskConfig {
  joinChannel: boolean;
  joinGroup: boolean;
  reactPinned: boolean;
  shareUsername: boolean;
  channelLink: string;
  groupLink: string;
  usernamePrompt: string;
}

export interface DiscordTaskConfig {
  joinServer: boolean;
  inviteLink: string;
}

export interface TwitterTaskConfig {
  followAccount: boolean;
  likePost: boolean;
  commentPost: boolean;
  quotePost: boolean;
  retweetPost: boolean;
  bookmarkPost: boolean;
  tagFriends: boolean;
  profileLink: string;
  postLinks: string[];
}

export interface SocialTaskConfig {
  telegram: TelegramTaskConfig;
  discord: DiscordTaskConfig;
  twitter: TwitterTaskConfig;
}

const defaultSocialTaskConfig: SocialTaskConfig = {
  telegram: {
    joinChannel: false,
    joinGroup: false,
    reactPinned: false,
    shareUsername: false,
    channelLink: "",
    groupLink: "",
    usernamePrompt: ""
  },
  discord: {
    joinServer: false,
    inviteLink: ""
  },
  twitter: {
    followAccount: false,
    likePost: false,
    commentPost: false,
    quotePost: false,
    retweetPost: false,
    bookmarkPost: false,
    tagFriends: false,
    profileLink: "",
    postLinks: ["" ]
  }
};

export function createDefaultSocialTaskConfig(): SocialTaskConfig {
  return JSON.parse(JSON.stringify(defaultSocialTaskConfig));
}

export function validateSocialTaskConfig(config: SocialTaskConfig): string[] {
  const errors: string[] = [];

  if (
    !config.telegram.joinChannel &&
    !config.telegram.joinGroup &&
    !config.telegram.reactPinned &&
    !config.telegram.shareUsername &&
    !config.discord.joinServer &&
    !config.twitter.followAccount &&
    !config.twitter.likePost &&
    !config.twitter.commentPost &&
    !config.twitter.quotePost &&
    !config.twitter.retweetPost &&
    !config.twitter.bookmarkPost &&
    !config.twitter.tagFriends
  ) {
    errors.push("Select at least one social action");
  }

  if (config.telegram.joinChannel && !config.telegram.channelLink.trim()) {
    errors.push("Provide a Telegram channel link");
  }

  if (config.telegram.joinGroup && !config.telegram.groupLink.trim()) {
    errors.push("Provide a Telegram group link");
  }

  if (config.discord.joinServer && !config.discord.inviteLink.trim()) {
    errors.push("Provide a Discord invite link");
  }

  const hasTwitterActions = config.twitter.followAccount ||
    config.twitter.likePost ||
    config.twitter.commentPost ||
    config.twitter.quotePost ||
    config.twitter.retweetPost ||
    config.twitter.bookmarkPost ||
    config.twitter.tagFriends;

  if (hasTwitterActions && !config.twitter.profileLink.trim()) {
    errors.push("Provide an X / Twitter profile link");
  }

  const hasTwitterPostActions = config.twitter.likePost ||
    config.twitter.commentPost ||
    config.twitter.quotePost ||
    config.twitter.retweetPost ||
    config.twitter.bookmarkPost;

  if (hasTwitterPostActions && (!config.twitter.postLinks || config.twitter.postLinks.length === 0 || !config.twitter.postLinks.some(link => link.trim()))) {
    errors.push("Add at least one post link for Twitter actions");
  }

  if (config.telegram.shareUsername && !config.telegram.usernamePrompt.trim()) {
    errors.push("Add a prompt for collected Telegram usernames");
  }

  return errors;
}
