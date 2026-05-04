package com.socialflow.constants;

public final class ErrorMessages {

    // Auth
    public static final String EMAIL_ALREADY_EXISTS = "Email already exists";
    public static final String INVALID_CREDENTIALS = "Invalid email or password";

    // Brand
    public static final String BRAND_NOT_FOUND = "Brand not found";
    public static final String BRAND_UNAUTHORIZED = "Unauthorized: Brand does not belong to user";
    public static final String NOT_AUTHORIZED = "Not authorized";

    // Post
    public static final String POST_NOT_FOUND = "Post not found";
    public static final String MEDIA_NOT_FOUND = "Media not found: ";
    public static final String PAGE_NOT_FOUND = "Page not found: ";
    public static final String CAMPAIGN_NOT_FOUND = "Campaign not found";
    public static final String CAMPAIGN_NOT_FOUND_WITH_ID = "Campaign not found: ";

    // Campaign
    public static final String CAMPAIGN_UNAUTHORIZED = "Unauthorized: Campaign does not belong to user";

    // Media upload
    public static final String UPLOAD_DIR_CREATE_FAILED = "Cannot create upload directory";
    public static final String FILE_EMPTY = "File is empty";
    public static final String INVALID_FILE_TYPE = "Only image and video files are allowed";
    public static final String MEDIA_UNAUTHORIZED = "Unauthorized to delete this media";
    public static final String MEDIA_ATTACHED_TO_POST = "Cannot delete media that is attached to a post";

    // Inbox
    public static final String MESSAGE_NOT_FOUND = "Message not found";
    public static final String UNAUTHORIZED = "Unauthorized";
    public static final String REPLIES_NOT_SUPPORTED = "Replies not supported for platform: ";

    // Analytics
    public static final String POST_ANALYTICS_NOT_FOUND = "No analytics found for post ";
    public static final String PAGE_ANALYTICS_NOT_FOUND = "No analytics found for page ";

    // Webhook
    public static final String WEBHOOK_VERIFICATION_FAILED = "Verification failed";
    public static final String WEBHOOK_INVALID_SIGNATURE = "Invalid signature";

    // Facebook API
    public static final String FB_DEBUG_TOKEN_ERROR = "FB debug_token error: ";
    public static final String FB_ACCOUNTS_ERROR = "FB /me/accounts error: ";
    public static final String FB_REPLY_FAILED = "Failed to reply on Facebook: ";

    private ErrorMessages() {}
}
