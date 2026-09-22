# CMS Admin API

All endpoints require an authenticated Better Auth user with the `admin` role.

## Media upload

`POST /admin/cms/media` accepts `multipart/form-data` with a `file` image field. Files are limited to 10 MB and are stored in the configured S3-compatible bucket. The response is a `MediaAsset` containing `id`, `url`, `key`, `filename`, `mimeType`, and `size`.

Use the returned `id` as `mediaAssetId` when creating a gallery item or optional testimonial photo.

## Content endpoints

| Resource | Collection | Item |
| --- | --- | --- |
| Gallery categories | `GET`, `POST` `/admin/cms/gallery/categories` | `PATCH`, `DELETE` `/admin/cms/gallery/categories/:id` |
| Gallery items | `GET`, `POST` `/admin/cms/gallery/items` | `PATCH`, `DELETE` `/admin/cms/gallery/items/:id` |
| Marquee | `GET`, `POST` `/admin/cms/marquee` | `PATCH`, `DELETE` `/admin/cms/marquee/:id` |
| Testimonials | `GET`, `POST` `/admin/cms/testimonials` | `PATCH`, `DELETE` `/admin/cms/testimonials/:id` |
| FAQs | `GET`, `POST` `/admin/cms/faqs` | `PATCH`, `DELETE` `/admin/cms/faqs/:id` |

Gallery `categoryId` is optional. Deleting a category only clears it from its gallery items. Publishing is controlled by `isPublished`; published gallery items receive `publishedAt` automatically.
