import React, { useState } from 'react';

export function FeedView() {
  const [content, setContent] = useState('');
  const [posts, setPosts] = useState<string[]>([]);

  const handlePublish = () => {
    if (!content.trim()) return;
    setPosts([content, ...posts]);
    setContent('');
  };

  return (
    <div className="p-4 max-w-xl mx-auto pb-20">
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-6 shadow-md">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="No que você está pensando?"
          className="w-full bg-transparent text-white placeholder-slate-400 resize-none focus:outline-none min-h-[90px] text-sm"
        />
        <div className="flex justify-end mt-2 border-t border-slate-800/60 pt-3">
          <button
            onClick={handlePublish}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow"
          >
            Publicar
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <p className="text-center text-slate-500 text-sm mt-8">Nenhuma publicação nesta comunidade ainda.</p>
        ) : (
          posts.map((post, index) => (
            <div key={index} className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-slate-200 text-sm">
              <p>{post}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
