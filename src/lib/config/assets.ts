/**
 * Centralized Assets Configuration
 * 
 * This file contains all asset paths used throughout the application.
 * Update paths here to change them globally across the codebase.
 */

export const ASSETS = {
	// Profile Avatars
	avatars: {
		default: '/images/avatars/default.svg',
		categories: {
			animals: [
				'/images/avatars/animals/cat.svg',
				'/images/avatars/animals/dog.svg',
				'/images/avatars/animals/fox.svg',
				'/images/avatars/animals/panda.svg',
				'/images/avatars/animals/lion.svg',
				'/images/avatars/animals/bear.svg',
				'/images/avatars/animals/rabbit.svg',
				'/images/avatars/animals/owl.svg'
			],
			characters: [
				'/images/avatars/characters/astronaut.svg',
				'/images/avatars/characters/ninja.svg',
				'/images/avatars/characters/robot.svg',
				'/images/avatars/characters/wizard.svg',
				'/images/avatars/characters/knight.svg',
				'/images/avatars/characters/pirate.svg',
				'/images/avatars/characters/superhero.svg',
				'/images/avatars/characters/alien.svg'
			],
			abstract: [
				'/images/avatars/abstract/gradient-1.svg',
				'/images/avatars/abstract/gradient-2.svg',
				'/images/avatars/abstract/gradient-3.svg',
				'/images/avatars/abstract/gradient-4.svg',
				'/images/avatars/abstract/geometric-1.svg',
				'/images/avatars/abstract/geometric-2.svg',
				'/images/avatars/abstract/geometric-3.svg',
				'/images/avatars/abstract/geometric-4.svg'
			],
			crypto: [
				'/images/avatars/crypto/bitcoin.svg',
				'/images/avatars/crypto/ethereum.svg',
				'/images/avatars/crypto/nft-1.svg',
				'/images/avatars/crypto/nft-2.svg',
				'/images/avatars/crypto/nft-3.svg',
				'/images/avatars/crypto/nft-4.svg',
				'/images/avatars/crypto/wallet.svg',
				'/images/avatars/crypto/diamond.svg'
			]
		}
	},

	// Event/Project Images
	events: {
		defaultBanner: '/images/events/default-banner.jpg',
		defaultLogo: '/images/events/default-logo.svg',
		placeholders: [
			'/images/events/placeholder-1.jpg',
			'/images/events/placeholder-2.jpg',
			'/images/events/placeholder-3.jpg'
		]
	},

	// General Images
	images: {
		banner: '/images/phaeton-banner.png',
		pfp: '/icons/pfp.png'
	},

	// Icons
	icons: {
		// Social Media
		social: {
			discord: '/icons/discord-logo.svg',
			telegram: '/icons/telegram-logo.svg',
			twitter: '/icons/x-logo.svg',
			github: '/icons/social/github.svg'
		},
		// Wallets
		wallets: {
			metamask: '/icons/wallets/metamask.svg',
			walletconnect: '/icons/wallets/walletconnect.svg',
			coinbase: '/icons/wallets/coinbase.svg'
		},
		// Rewards
		rewards: {
			token: '/icons/rewards/token.svg',
			eth: '/icons/rewards/eth.svg',
			nft: '/icons/rewards/nft.svg',
			gift: '/icons/rewards/gift.svg',
			voucher: '/icons/rewards/voucher.svg',
			points: '/icons/rewards/points.svg'
		},
		// UI
		ui: {
			logo: '/icons/logo.svg',
			logoText: '/icons/logo-text.svg',
			checkmark: '/icons/checkmark.svg',
			close: '/icons/close.svg',
			menu: '/icons/menu.svg',
			settings: '/icons/settings.svg',
			notification: '/icons/notification.svg',
			nextDotted: '/icons/next-dotted.svg',
			next: '/icons/arrow-right.svg',
			info: '/icons/info.svg',
			quickEvent: '/icons/quick-event.svg',
			community: '/icons/community.svg'
		}
	},

	// Background Images
	backgrounds: {
		hero: '/images/backgrounds/hero-bg.jpg',
		pattern: '/images/backgrounds/pattern.svg',
		gradient: '/images/backgrounds/gradient.jpg'
	},

	// Illustrations
	illustrations: {
		emptyState: '/images/illustrations/empty-state.svg',
		error404: '/images/illustrations/404.svg',
		success: '/images/illustrations/success.svg',
		loading: '/images/illustrations/loading.svg'
	}
} as const;

/**
 * Get all avatars as a flat array
 */
export function getAllAvatars(): string[] {
	const { categories } = ASSETS.avatars;
	return [
		...categories.animals,
		...categories.characters,
		...categories.abstract,
		...categories.crypto
	];
}

/**
 * Get avatars by category
 */
export function getAvatarsByCategory(category: keyof typeof ASSETS.avatars.categories): string[] {
	return ASSETS.avatars.categories[category];
}

/**
 * Get random avatar
 */
export function getRandomAvatar(): string {
	const allAvatars = getAllAvatars();
	return allAvatars[Math.floor(Math.random() * allAvatars.length)];
}

/**
 * Asset categories for easy iteration
 */
export const AVATAR_CATEGORIES = [
	{ id: 'animals', name: 'Animals', icon: '🐾' },
	{ id: 'characters', name: 'Characters', icon: '👤' },
	{ id: 'abstract', name: 'Abstract', icon: '🎨' },
	{ id: 'crypto', name: 'Crypto', icon: '₿' }
] as const;
