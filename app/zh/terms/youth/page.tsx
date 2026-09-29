'use client';

export default function ChineseYouthProtectionPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-20">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">青少年保护政策</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. 政策目的</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              ARATA致力于为青少年提供安全健康的互联网环境，根据相关法律规定制定并实施青少年保护政策。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. 有害信息过滤</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>为保护青少年免受有害内容影响，公司运营以下系统：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>成人内容年龄认证系统：对19岁以上成人内容进行访问限制</li>
                <li>有害词汇过滤系统：自动过滤评论和社区中的不当用语</li>
                <li>举报系统：用户可举报不当内容，管理员立即处理</li>
                <li>内容分级系统：根据年龄段对内容进行分级管理</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. 青少年个人信息保护</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>① 14岁以下儿童注册会员时，需获得法定代理人同意。</p>
              <p>② 公司收集14岁以下儿童个人信息时，最小化收集达成目的所需的最少信息。</p>
              <p>③ 法定代理人可随时要求查询、修改或删除儿童的个人信息。</p>
              <p>④ 14岁以下儿童的个人信息保留期限与一般会员相同，达成目的后立即销毁。</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. 法定代理人的权利</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>14岁以下儿童的法定代理人拥有以下权利：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>查询儿童个人信息的权利</li>
                <li>要求修改或删除儿童个人信息的权利</li>
                <li>撤销儿童会员注册同意的权利</li>
                <li>限制儿童使用服务的权利</li>
              </ul>
              <p className="mt-3">联系方式：support@arata.co.kr</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. 青少年保护负责人</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>公司指定以下青少年保护负责人：</p>
              <div className="ml-4 space-y-2">
                <p>姓名：ARATA客服中心</p>
                <p>联系电话：（待定）</p>
                <p>邮箱：youth@arata.co.kr</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. 监护人指南</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>为保护青少年安全使用互联网，建议监护人：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>定期与孩子沟通互联网使用情况</li>
                <li>确认孩子访问的网站和使用的服务</li>
                <li>设置适合孩子年龄的内容过滤</li>
                <li>教育孩子保护个人信息的重要性</li>
                <li>监督孩子的在线交流和活动</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. 举报及咨询</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>如发现不当内容或侵害青少年权益的情况，请通过以下方式联系：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>服务内举报功能</li>
                <li>邮箱：report@arata.co.kr</li>
                <li>客服中心：support@arata.co.kr</li>
              </ul>
              <p className="mt-3">我们将在收到举报后24小时内进行审核并采取相应措施。</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. 相关法律及机构</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>青少年保护相关法律及支持机构：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>青少年保护法</li>
                <li>信息通信网法</li>
                <li>个人信息保护法</li>
              </ul>
            </div>
          </section>

          <section className="pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              生效日期：2025年1月1日<br />
              最后修订：2025年1月1日
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
