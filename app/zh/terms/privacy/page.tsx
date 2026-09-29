'use client';

export default function ChinesePrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-20">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">隐私政策</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. 收集的个人信息项目</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>公司为提供服务收集以下个人信息：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>必填项目：邮箱地址、密码、昵称</li>
                <li>选填项目：手机号码、出生日期、性别</li>
                <li>自动收集项目：IP地址、Cookie、访问日志、服务使用记录</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. 个人信息的收集和使用目的</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>公司将收集的个人信息用于以下目的：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>会员管理：会员身份确认、个人识别、防止非法使用</li>
                <li>服务提供：内容提供、购买及支付、发送购买收据</li>
                <li>营销：提供活动信息、提供广告</li>
                <li>服务改善：开发新服务、提供定制服务</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. 个人信息的保留和使用期限</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>原则上，在达成个人信息收集和使用目的后立即销毁。但根据相关法律规定，需保留时除外：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>合同或撤销认购等相关记录：5年</li>
                <li>支付及商品供应等相关记录：5年</li>
                <li>消费者投诉或纠纷处理相关记录：3年</li>
                <li>访问日志：3个月</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. 个人信息的销毁程序和方法</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>① 销毁程序</p>
              <p className="ml-4">会员为使用服务输入的信息在达成目的后，根据内部政策和相关法律规定的信息保护事由（参照保留和使用期限）保存一定期间后销毁。</p>
              <p>② 销毁方法</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>以纸质形式打印的个人信息：通过碎纸机粉碎或焚烧销毁</li>
                <li>以电子文件形式保存的个人信息：使用无法再现记录的技术方法删除</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. 个人信息的提供</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              公司原则上不向外部提供用户的个人信息。但以下情况例外：
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700 dark:text-gray-300 mt-3">
              <li>用户事先同意</li>
              <li>根据法律规定或为调查目的按照法律规定的程序和方法要求时</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. 个人信息的委托处理</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>为提高服务质量，公司可将个人信息委托给外部专业公司处理：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>委托业务内容：支付处理、客户服务</li>
                <li>委托期限：会员退出或合同终止时</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. 用户和法定代理人的权利及行使方法</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>① 用户和法定代理人可随时查询或修改已注册的自己或14岁以下儿童的个人信息，并可要求退出。</p>
              <p>② 用户或法定代理人可通过书面、电话或邮件联系个人信息保护负责人，我们将立即采取措施。</p>
              <p>③ 用户要求更正个人信息错误时，在更正完成前不使用或提供该个人信息。</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. 个人信息自动收集装置的安装、操作及拒绝相关事项</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>① 公司使用存储并随时查找用户信息的"Cookie"。</p>
              <p>② Cookie的使用目的：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>识别会员和非会员的访问频率或访问时间</li>
                <li>了解用户喜好和关注领域，用于定向营销</li>
              </ul>
              <p>③ Cookie的安装·操作及拒绝：</p>
              <p className="ml-4">可通过Web浏览器选项设置拒绝Cookie存储。但拒绝Cookie存储可能导致服务使用困难。</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. 个人信息保护负责人</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>公司指定以下个人信息保护负责人，负责处理与个人信息处理相关的投诉及损害救济：</p>
              <div className="ml-4 space-y-2">
                <p>个人信息保护负责人</p>
                <p>姓名：ARATA客服中心</p>
                <p>邮箱：support@arata.co.kr</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. 隐私政策的变更</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              本隐私政策的变更将通过网站公告事项（或个别通知）进行公告。
            </p>
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
