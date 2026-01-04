declare module '@tryghost/content-api' {
    export interface GhostContentAPIOptions {
        url: string;
        key: string;
        version: string;
    }

    export interface GhostPost {
        id: string;
        uuid: string;
        title: string;
        slug: string;
        html: string;
        comment_id?: string;
        feature_image?: string | null;
        featured?: boolean;
        visibility?: string;
        created_at?: string;
        updated_at?: string;
        published_at?: string | null;
        custom_excerpt?: string | null;
        codeinjection_head?: string | null;
        codeinjection_foot?: string | null;
        custom_template?: string | null;
        canonical_url?: string | null;
        tags?: GhostTag[];
        primary_author?: GhostAuthor;
        primary_tag?: GhostTag;
        url?: string;
        excerpt?: string;
        reading_time?: number;
        og_image?: string | null;
        og_title?: string | null;
        og_description?: string | null;
        twitter_image?: string | null;
        twitter_title?: string | null;
        twitter_description?: string | null;
        meta_title?: string | null;
        meta_description?: string | null;
    }

    export interface GhostTag {
        id: string;
        name: string;
        slug: string;
        description?: string | null;
        feature_image?: string | null;
        visibility?: string;
        meta_title?: string | null;
        meta_description?: string | null;
        url?: string;
    }

    export interface GhostAuthor {
        id: string;
        name: string;
        slug: string;
        profile_image?: string | null;
        cover_image?: string | null;
        bio?: string | null;
        website?: string | null;
        location?: string | null;
        facebook?: string | null;
        twitter?: string | null;
        meta_title?: string | null;
        meta_description?: string | null;
        url?: string;
    }

    export interface BrowseOptions {
        limit?: number | 'all';
        page?: number;
        order?: string;
        include?: string | string[];
        filter?: string;
        formats?: string | string[];
    }

    export interface ReadOptions {
        include?: string | string[];
        formats?: string | string[];
    }

    export interface Parameters {
        id?: string;
        slug?: string;
    }

    class Posts {
        browse(options?: BrowseOptions): Promise<GhostPost[]>;
        read(data: Parameters, options?: ReadOptions): Promise<GhostPost>;
    }

    export default class GhostContentAPI {
        constructor(options: GhostContentAPIOptions);
        posts: Posts;
    }
}
