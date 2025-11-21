import { supabase } from "@/lib/supabase";
import { extractHashtags, extractMentions } from "@/utils/textUtils";

export const useHashtagsAndMentions = () => {
  const processPostHashtagsAndMentions = async (
    postId: string,
    content: string,
    userId: string
  ) => {
    try {
      // Extrair hashtags
      const hashtags = extractHashtags(content);
      
      if (hashtags.length > 0) {
        for (const tag of hashtags) {
          // Criar ou atualizar hashtag
          const { data: existingHashtag } = await supabase
            .from("hashtags")
            .select("id, post_count")
            .eq("name", tag)
            .single();

          let hashtagId: string;

          if (existingHashtag) {
            hashtagId = existingHashtag.id;
            // Atualizar contagem
            await supabase
              .from("hashtags")
              .update({ post_count: existingHashtag.post_count + 1 })
              .eq("id", hashtagId);
          } else {
            // Criar nova hashtag
            const { data: newHashtag } = await supabase
              .from("hashtags")
              .insert({ name: tag, post_count: 1 })
              .select()
              .single();

            if (newHashtag) {
              hashtagId = newHashtag.id;
            } else {
              continue;
            }
          }

          // Criar relação post-hashtag (ignora se já existe)
          const { data: existing } = await supabase
            .from("post_hashtags")
            .select("id")
            .eq("post_id", postId)
            .eq("hashtag_id", hashtagId)
            .single();

          if (!existing) {
            await supabase
              .from("post_hashtags")
              .insert({
                post_id: postId,
                hashtag_id: hashtagId,
              });
          }
        }
      }

      // Extrair menções
      const mentions = extractMentions(content);
      
      if (mentions.length > 0) {
        for (const username of mentions) {
          // Buscar usuário mencionado
          const { data: mentionedUser } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", username)
            .single();

          if (mentionedUser && mentionedUser.id !== userId) {
            // Criar menção (ignora se já existe)
            const { data: existingMention } = await supabase
              .from("post_mentions")
              .select("id")
              .eq("post_id", postId)
              .eq("mentioned_user_id", mentionedUser.id)
              .single();

            if (!existingMention) {
              await supabase
                .from("post_mentions")
                .insert({
                  post_id: postId,
                  mentioned_user_id: mentionedUser.id,
                });

              // Criar notificação
              await supabase
                .from("notifications")
                .insert({
                  user_id: mentionedUser.id,
                  type: "mention",
                  title: "Menção",
                  message: "mencionou-te a ti e a outros seguidores num post",
                  related_id: postId,
                });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing hashtags and mentions:", error);
    }
  };

  const processCommentHashtagsAndMentions = async (
    commentId: string,
    content: string,
    userId: string,
    postId: string
  ) => {
    try {
      // Extrair menções em comentários
      const mentions = extractMentions(content);
      
      if (mentions.length > 0) {
        for (const username of mentions) {
          // Buscar usuário mencionado
          const { data: mentionedUser } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", username)
            .single();

          if (mentionedUser && mentionedUser.id !== userId) {
            // Criar menção (ignora se já existe)
            const { data: existingMention } = await supabase
              .from("comment_mentions")
              .select("id")
              .eq("comment_id", commentId)
              .eq("mentioned_user_id", mentionedUser.id)
              .single();

            if (!existingMention) {
              await supabase
                .from("comment_mentions")
                .insert({
                  comment_id: commentId,
                  mentioned_user_id: mentionedUser.id,
                });

              // Criar notificação
              await supabase
                .from("notifications")
                .insert({
                  user_id: mentionedUser.id,
                  type: "mention",
                  title: "Menção",
                  message: "mencionou-te a ti e a outros seguidores num comentário",
                  related_id: postId,
                });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing comment mentions:", error);
    }
  };

  return {
    processPostHashtagsAndMentions,
    processCommentHashtagsAndMentions,
  };
};
