import type { z } from 'zod';
import { BlogPostModel, CmsPageModel, FaqModel, HomepageConfigModel } from './cms.model';
import { SupportEnquiryModel } from '../support/support.model';
import { AppError } from '../../middleware/error.middleware';
import type { blogSchema, cmsPageSchema, faqSchema, homepageConfigPatchSchema } from './cmsSettings.validation';

export async function ensureHomepageConfig() {
  return HomepageConfigModel.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
}

export async function updateHomepageConfigAdmin(patch: z.infer<typeof homepageConfigPatchSchema>) {
  const updated = await HomepageConfigModel.findOneAndUpdate(
    { key: 'main' },
    { $set: patch },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return updated;
}

export async function listCmsPagesAdmin() {
  const pages = await CmsPageModel.find().sort({ slug: 1 }).lean();
  return pages.map((p) => ({ ...p, id: String(p._id) }));
}

export async function createCmsPageAdmin(input: z.infer<typeof cmsPageSchema>) {
  const page = await CmsPageModel.create(input);
  return { ...page.toObject(), id: String(page._id) };
}

export async function updateCmsPageAdmin(id: string, input: z.infer<typeof cmsPageSchema>) {
  const updated = await CmsPageModel.findByIdAndUpdate(id, { $set: input }, { new: true });
  if (!updated) throw new AppError(404, 'PAGE_NOT_FOUND', 'CMS page not found.');
  return { ...updated.toObject(), id: String(updated._id) };
}

export async function deleteCmsPageAdmin(id: string) {
  const deleted = await CmsPageModel.findByIdAndDelete(id);
  if (!deleted) throw new AppError(404, 'PAGE_NOT_FOUND', 'CMS page not found.');
  return { deleted: true };
}

export async function listFaqsAdmin() {
  const faqs = await FaqModel.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  return faqs.map((f) => ({ ...f, id: String(f._id) }));
}

export async function createFaqAdmin(input: z.infer<typeof faqSchema>) {
  const faq = await FaqModel.create(input);
  return { ...faq.toObject(), id: String(faq._id) };
}

export async function updateFaqAdmin(id: string, input: z.infer<typeof faqSchema>) {
  const updated = await FaqModel.findByIdAndUpdate(id, { $set: input }, { new: true });
  if (!updated) throw new AppError(404, 'FAQ_NOT_FOUND', 'FAQ not found.');
  return { ...updated.toObject(), id: String(updated._id) };
}

export async function deleteFaqAdmin(id: string) {
  const deleted = await FaqModel.findByIdAndDelete(id);
  if (!deleted) throw new AppError(404, 'FAQ_NOT_FOUND', 'FAQ not found.');
  return { deleted: true };
}

export async function listBlogsAdmin() {
  const posts = await BlogPostModel.find().sort({ createdAt: -1 }).lean();
  return posts.map((p) => ({ ...p, id: String(p._id) }));
}

export async function createBlogAdmin(input: z.infer<typeof blogSchema>) {
  const post = await BlogPostModel.create({
    ...input,
    publishedAt: input.isPublished ? new Date() : null,
  });
  return { ...post.toObject(), id: String(post._id) };
}

export async function updateBlogAdmin(id: string, input: z.infer<typeof blogSchema>) {
  const updated = await BlogPostModel.findByIdAndUpdate(
    id,
    { $set: { ...input, publishedAt: input.isPublished ? new Date() : null } },
    { new: true },
  );
  if (!updated) throw new AppError(404, 'BLOG_NOT_FOUND', 'Blog post not found.');
  return { ...updated.toObject(), id: String(updated._id) };
}

export async function deleteBlogAdmin(id: string) {
  const deleted = await BlogPostModel.findByIdAndDelete(id);
  if (!deleted) throw new AppError(404, 'BLOG_NOT_FOUND', 'Blog post not found.');
  return { deleted: true };
}

export async function listSupportEnquiriesAdmin() {
  const enquiries = await SupportEnquiryModel.find().sort({ createdAt: -1 }).limit(100).lean();
  return enquiries.map((e) => ({ ...e, id: String(e._id) }));
}

export async function updateSupportEnquiryAdmin(params: {
  id: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  internalNote?: string;
  actorName: string;
}) {
  const enquiry = await SupportEnquiryModel.findById(params.id);
  if (!enquiry) throw new AppError(404, 'ENQUIRY_NOT_FOUND', 'Enquiry not found.');
  enquiry.status = params.status;
  if (params.internalNote) {
    enquiry.internalNotes.push({ note: params.internalNote, actorName: params.actorName, timestamp: new Date() });
  }
  await enquiry.save();
  return { ...enquiry.toObject(), id: String(enquiry._id) };
}
